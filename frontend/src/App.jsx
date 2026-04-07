import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Login from './Pages/Login'
import Bitboard from './Pages/Bitboard'

const App = () => {
  return (
    <>
      <Routes>
        <Route path='/' element={<Login />}>
        <Route path='Bitboard' element={<Bitboard/>}/>
        
        
          

        </Route>
      </Routes>
    </>
  )
}

export default App