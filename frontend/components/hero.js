import React from 'react';
import PropTypes from 'prop-types';
import './hero.css';
import { useNavigate } from 'react-router-dom';

const Hero = (props) => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/upload-options');
  };

  return (
    <div className="hero-header78">
      <div className="hero-column thq-section-padding thq-section-max-width">
        <div className="hero-content">
          <h1 className="hero-text thq-heading-1">{props.heading1}</h1>
          <p className="hero-text1 thq-body-large">{props.content1}</p>
        </div>
        <div className="hero-actions">
          <button className="thq-button-filled hero-button" onClick={handleGetStarted}>
            Get Started
          </button>
        </div>
      </div>
    
      <div>
        <div className="hero-container1">
          <style>
            {`
              @keyframes scroll-x {
                from {
                  transform: translateX(0);
                }
                to {
                  transform: translateX(calc(-100% - 16px));
                }
              }

              @keyframes scroll-y {
                from {
                  transform: translateY(0);
                }
                to {
                  transform: translateY(calc(-100% - 16px));
                }
              }
            `}
          </style>
        </div>
      </div>
    </div>
  );
};

Hero.propTypes = {
  heading1: PropTypes.string,
  content1: PropTypes.string,
  action1: PropTypes.string
};

Hero.defaultProps = {
  heading1: 'Welcome to The Accident Detection System',
  content1: 'Quickly and accurately detect vehicle accidents with our advanced technology.',
  action1: 'Get Started'
};

export default Hero;
