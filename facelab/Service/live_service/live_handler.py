import cv2
import torch
import numpy as np
from PIL import Image
from torchvision import transforms
import torch.nn.functional as F
import os
import sys
from pathlib import Path

# We assume sys.path is already set up by app.py to include SimSwap roots
from models.models import create_model
from options.test_options import TestOptions
from insightface_func.face_detect_crop_single import Face_detect_crop
# from util.norm import SpecificNorm # Unused in simplified version
# from util.add_watermark import watermark_image # Unused

def reverse2wholeimage_memory(b_align_crop_tenor_list, swaped_imgs, mats, crop_size, oriimg):
    target_image_list = []
    img_mask_list = []
    
    for swaped_img, mat, source_img in zip(swaped_imgs, mats, b_align_crop_tenor_list):
        swaped_img = swaped_img.cpu().detach().numpy().transpose((1, 2, 0))
        img_white = np.full((crop_size, crop_size), 255, dtype=float)

        # inverse the Affine transformation matrix
        mat_rev = np.zeros([2, 3])
        div1 = mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0]
        mat_rev[0][0] = mat[1][1] / div1
        mat_rev[0][1] = -mat[0][1] / div1
        mat_rev[0][2] = -(mat[0][2] * mat[1][1] - mat[0][1] * mat[1][2]) / div1
        div2 = mat[0][1] * mat[1][0] - mat[0][0] * mat[1][1]
        mat_rev[1][0] = mat[1][0] / div2
        mat_rev[1][1] = -mat[0][0] / div2
        mat_rev[1][2] = -(mat[0][2] * mat[1][0] - mat[0][0] * mat[1][2]) / div2

        orisize = (oriimg.shape[1], oriimg.shape[0])
        
        target_image = cv2.warpAffine(swaped_img, mat_rev, orisize)
        img_white = cv2.warpAffine(img_white, mat_rev, orisize)

        img_white[img_white > 20] = 255
        img_mask = img_white

        kernel = np.ones((40, 40), np.uint8)
        img_mask = cv2.erode(img_mask, kernel, iterations=1)
        kernel_size = (20, 20)
        blur_size = tuple(2 * i + 1 for i in kernel_size)
        img_mask = cv2.GaussianBlur(img_mask, blur_size, 0)

        img_mask /= 255
        img_mask = np.reshape(img_mask, [img_mask.shape[0], img_mask.shape[1], 1])

        target_image = np.array(target_image, dtype=float)[..., ::-1] * 255

        img_mask_list.append(img_mask)
        target_image_list.append(target_image)

    img = np.array(oriimg, dtype=float)
    for img_mask, target_image in zip(img_mask_list, target_image_list):
        img = img_mask * target_image + (1 - img_mask) * img
        
    final_img = img.astype(np.uint8)
    return final_img

class SimSwapLive:
    def __init__(self, root_dir):
        """
        root_dir: Path object pointing to the SimSwap root directory containing models/
        """
        # Override sys.argv before parsing to avoid conflicts with uvicorn args
        # (TestOptions uses argparse.parse_args() which reads sys.argv)
        import sys
        _orig_argv = sys.argv
        sys.argv = [sys.argv[0]]
        self.opt = TestOptions().parse()
        sys.argv = _orig_argv

        self.opt.isTrain = False
        self.opt.crop_size = 224 # Force 224 for speed
        self.opt.no_simswaplogo = True
        
        # Set paths relative to the provided root
        # Checkpoint is hardcoded in options usually, but we overwrite here
        # arcface_model/arcface_checkpoint.tar
        self.opt.Arc_path = str(root_dir / 'arcface_model/arcface_checkpoint.tar')
        
        # The create_model function in SimSwap might rely on relative paths or options
        # We need to make sure it finds the checkpoints. 
        # SimSwap's `create_model` uses `opt.checkpoints_dir` which defaults to `./checkpoints`
        self.opt.checkpoints_dir = str(root_dir / 'checkpoints')
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        print(f"Loading SimSwap model on {self.device}...")
        # Note: TestOptions might rely on sys.argv, so we might need to mock it if it fails,
        # but since we call parse(), it should be fine.
        
        self.model = create_model(self.opt)
        self.model.eval()
        self.model.to(self.device)
        
        self.extract_transformer = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        
        # Face Detector
        print("Loading Face Detector...")
        # InsightFace models
        self.app_fd = Face_detect_crop(name='antelopeV2', root=str(root_dir / 'insightface_func/models'))
        self.app_fd.prepare(ctx_id=0, det_thresh=0.6, det_size=(640,640))
        
        print("SimSwapLive Initialized!")

    def _totensor(self, array):
        tensor = torch.from_numpy(array)
        img = tensor.transpose(0, 1).transpose(0, 2).contiguous()
        return img.float().div(255)

    def prepare_source(self, img_path):
        img_a_whole = cv2.imread(img_path)
        if img_a_whole is None:
            raise ValueError(f"Could not read source image: {img_path}")
            
        img_a_align_crop, _ = self.app_fd.get(img_a_whole, self.opt.crop_size)
        if not img_a_align_crop:
             raise ValueError("No face detected in source image")
             
        img_a_align_crop_pil = Image.fromarray(cv2.cvtColor(img_a_align_crop[0], cv2.COLOR_BGR2RGB))
        img_a = self.extract_transformer(img_a_align_crop_pil)
        img_id = img_a.view(-1, img_a.shape[0], img_a.shape[1], img_a.shape[2])
        img_id = img_id.to(self.device)

        with torch.no_grad():
            img_id_downsample = F.interpolate(img_id, size=(112, 112))
            latend_id = self.model.netArc(img_id_downsample)
            latend_id = F.normalize(latend_id, p=2, dim=1)
        
        return latend_id.cpu() 

    def swap(self, frame, latent_id_tensor):
        img_b_whole = frame
        
        # Optimization: Downscale for detection to speed up
        detection_scale = 0.5
        img_b_small = cv2.resize(img_b_whole, (0, 0), fx=detection_scale, fy=detection_scale)
        
        # Detect on small image - we only care about the matrices (landmarks)
        _, b_mat_list = self.app_fd.get(img_b_small, self.opt.crop_size)
        
        if not b_mat_list:
            return frame 
            
        swap_result_list = []
        b_align_crop_tenor_list = []
        new_mat_list = []
        
        latent_id = latent_id_tensor.to(self.device)

        with torch.no_grad():
            for mat in b_mat_list:
                # Adjust matrix for large image
                # M_new = M_old * Scale_Matrix
                # We need to multiply the linear part (rotation/scale) by detection_scale
                # to handle the fact that input coordinates are now larger (so we scale them down first)
                mat_l = mat.copy()
                mat_l[0, 0] *= detection_scale
                mat_l[0, 1] *= detection_scale
                mat_l[1, 0] *= detection_scale
                mat_l[1, 1] *= detection_scale
                
                new_mat_list.append(mat_l)
                
                # Re-crop from whole image using adjusted matrix to maintain quality
                b_align_crop = cv2.warpAffine(img_b_whole, mat_l, (self.opt.crop_size, self.opt.crop_size))
                
                b_align_crop_tenor = self._totensor(cv2.cvtColor(b_align_crop, cv2.COLOR_BGR2RGB))[None, ...].to(self.device)
                
                swap_result = self.model(None, b_align_crop_tenor, latent_id, None, True)[0]
                swap_result_list.append(swap_result)
                b_align_crop_tenor_list.append(b_align_crop_tenor)
                
            final_img = reverse2wholeimage_memory(
                b_align_crop_tenor_list, 
                swap_result_list, 
                new_mat_list, 
                self.opt.crop_size, 
                img_b_whole
            )
            
        return final_img