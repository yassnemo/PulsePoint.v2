import React from 'react';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDarkMode, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="theme-toggle"
      aria-label="Toggle theme"
      aria-pressed={isDarkMode}
    >
      <div className="toggle-content">
        {/* Sun */}
        <div className={`sun ${isDarkMode ? 'sun-hidden' : 'sun-visible'}`}>
          <div className="sun-center"></div>
          <div className="sun-rays">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`sun-ray sun-ray-${i + 1}`}></div>
            ))}
          </div>
        </div>
        
        {/* Moon */}
        <div className={`moon ${isDarkMode ? 'moon-visible' : 'moon-hidden'}`}>
          <div className="moon-crater moon-crater-1"></div>
          <div className="moon-crater moon-crater-2"></div>
          <div className="moon-crater moon-crater-3"></div>
        </div>
        
        {/* Background */}
        <div className={`toggle-bg ${isDarkMode ? 'bg-night' : 'bg-day'}`}>
          {/* Stars for night mode */}
          {isDarkMode && (
            <div className="stars">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`star star-${i + 1}`}></div>
              ))}
            </div>
          )}
          
          {/* Clouds for day mode */}
          {!isDarkMode && (
            <div className="clouds">
              <div className="cloud cloud-1"></div>
              <div className="cloud cloud-2"></div>
              <div className="cloud cloud-3"></div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
