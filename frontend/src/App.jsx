import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  )
}

export default App
