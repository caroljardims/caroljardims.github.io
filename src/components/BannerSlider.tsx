// src/components/BannerSlider.tsx
import React, { useState, useEffect } from 'react';

type Slide =
  | { type: 'image'; src: string; alt: string }
  | { type: 'gradient'; gradient: string };

const slides: Slide[] = [
  { type: 'gradient', gradient: 'linear-gradient(135deg, #FEC5BB 0%, #FFD7BA 50%, #FEC89A 100%)' },
  { type: 'image', src: '/images/flowers.jpeg', alt: 'Flowers' },
  { type: 'image', src: '/images/landscape.jpeg', alt: 'Landscape' },
  { type: 'image', src: '/images/lookingdown.jpeg', alt: 'Looking down' },
  { type: 'gradient', gradient: 'linear-gradient(135deg, #FAE1DD 0%, #FCD5CE 40%, #FFE5D9 100%)' },
];

export const BannerSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {slide.type === 'image' ? (
            <>
              <img
                src={slide.src}
                alt={slide.alt}
                className="w-full h-full object-cover"
                style={{ transform: `translateY(${scrollY * 0.4}px)`, willChange: 'transform' }}
              />
              <div className="absolute inset-0 bg-black/35"></div>
            </>
          ) : (
            <div className="w-full h-full" style={{ background: slide.gradient }} />
          )}
        </div>
      ))}

      {/* Content overlay */}
      {(() => {
        const isGradient = slides[currentIndex]?.type === 'gradient';
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-6">
            <h1 className={`text-6xl md:text-7xl font-bold mb-4 tracking-tight transition-colors duration-700 ${isGradient ? 'text-slate-700 drop-shadow-none' : 'text-white drop-shadow-lg'}`}>
              oi 👋
            </h1>
            <a
              href="#projects"
              className={`text-lg md:text-xl transition-colors duration-700 underline underline-offset-4 ${isGradient ? 'text-slate-600 decoration-slate-400/60 hover:text-slate-800 hover:decoration-slate-600' : 'text-white/90 hover:text-white decoration-white/40 hover:decoration-white'}`}
            >
              veja as coisinhas que eu fiz por aqui
            </a>
          </div>
        );
      })()}

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-5 top-1/2 -translate-y-1/2 z-20 bg-white/15 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm"
        aria-label="Foto anterior"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-5 top-1/2 -translate-y-1/2 z-20 bg-white/15 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm"
        aria-label="Próxima foto"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-white w-6'
                : 'bg-white/40 hover:bg-white/60 w-1.5'
            }`}
            aria-label={`Ir para foto ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 right-8 z-20 text-white/50 text-xs tracking-widest uppercase hidden md:block">
        scroll
      </div>
    </div>
  );
};
