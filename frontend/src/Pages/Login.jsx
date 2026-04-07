import React from 'react'
import { assets } from '../assets/assets'
const CSS = `
/* ─── GLOBAL GRID BACKGROUND ─── */
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
  font-family: var(--fb);
  color: var(--black);
  /* base checkerboard grid */
  background-color: var(--bg);
  background-image:
    linear-gradient(rgba(0,0,0,0.065) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.065) 1px, transparent 1px);
  background-size: var(--cell) var(--cell);
}

/* Animated secondary grid layer – shifts opacity slowly */
.app::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(rgba(80,80,80,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(80,80,80,0.06) 1px, transparent 1px);
  background-size: var(--cell) var(--cell);
  animation: gridBreath 8s ease-in-out infinite;
}

@keyframes gridBreath {
  0%,100% { opacity: 0.2; }
  40%      { opacity: 1;   }
  70%      { opacity: 0.6; }
}

/* ─── HOVER ZONE: grid darkens on hover ─── */
/* Applied to sidebar, topbar, and individual posts */
.zone {
  position: relative;
  z-index: 1;
}
.zone::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,0,0,0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.09) 1px, transparent 1px);
  background-size: var(--cell) var(--cell);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 0;
}
.zone:hover::after { opacity: 1; }
`;
const Login = () => {
    return (
    <div className = 'min-h-screen flex flex-col md:flex-row'>

           {/* left side : Branding */}
           <div className="flex-1 flex flex-col items-start justify-between p-6 md:p-10
           lg:pl-40">
            {/* left side : Logo */}
            <span className="logo-b">B</span>         
            <span className="logo-script">it.board</span> 
            <span className="logo-pen">✏</span>

            <div>
            <div className='flex items-center gap-3 mb-4 max-md:mt-10'> {/*quotes*/}
                
            </div>
            <h1 className='text-3xl md:text-6xl md:pb-2 font-bold bg-gradient-to-r
            from-indigo-950 to-indigo-800 bg-clip-text text-transparent'>Where every 
            picture is pixel perfect</h1>
            <p className='text-xl md:text-3xl text-indigo-900 max-w-72
            md:max-w-md'>connect together and share your love of pixel art together.</p>
           </div>
           <span className='md:h-10'></span>
        </div>
        {/*right side: login form */}
        <div className='flex-1 flex items-center justify-center p-6 sm:p-10'>
            {/* https://clerk.com/?utm_source=greatstack&utm_medium=youtube&utm_campaign=social-media&dub_id=z1L0s5X21ZW9rFyi*/}
            {/*website for authentication on youtube video at 38:10*/}
            

        </div>
    </div>
    )
}

export default Login