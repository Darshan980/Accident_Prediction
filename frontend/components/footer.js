import React from 'react';
import PropTypes from 'prop-types';
import './footer.css';

const Footer = (props) => {
  return (
    <footer className="footer-footer1">
      <div className="footer-content">
        <span className="footer-text">{props.content3}</span>
        <div className="footer-links">
          <a href={props.privacyLink} className="footer-link">Privacy Policy</a>
          <a href={props.termsLink} className="footer-link">Terms of Service</a>
          <a href={props.cookiesLink} className="footer-link">Cookies Policy</a>
        </div>
      </div>
    </footer>
  );
};

Footer.defaultProps = {
  content3: '© 2024 Accident Detection System. All rights reserved.',
  cookiesLink: '/cookies-policy',
  privacyLink: '/privacy-policy',
  termsLink: '/terms-of-service',
};

Footer.propTypes = {
  content3: PropTypes.string,
  cookiesLink: PropTypes.string,
  privacyLink: PropTypes.string,
  termsLink: PropTypes.string,
};

export default Footer;
