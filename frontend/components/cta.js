import React from 'react';
import PropTypes from 'prop-types';
import './cta.css';

const CTA = (props) => {
  return (
    <div className="thq-section-padding">
      <div className="thq-section-max-width">
        <div className="cta-accent2-bg">
          <div className="cta-accent1-bg">
            <div className="cta-container1">
              <div className="cta-content">
                <span className="thq-heading-2">{props.heading1}</span>
                <p className="thq-body-large">{props.content1}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

CTA.defaultProps = {
  heading1: 'Get Help Quickly',
  content1: 'In case of a vehicle accident, every second counts. Use our platform to quickly alert emergency services and loved ones.',
};

CTA.propTypes = {
  heading1: PropTypes.string,
  content1: PropTypes.string,
};

export default CTA;
