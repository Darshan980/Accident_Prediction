import React from 'react'

import PropTypes from 'prop-types'

import './steps.css'

const Steps = (props) => {
  return (
    <div className="steps-container thq-section-padding">
      <div className="steps-max-width thq-section-max-width">
        <div className="steps-container1 thq-grid-2">
          <div className="steps-section-header">
            <h2 className="thq-heading-2">
              Discover the Power of Our Products
            </h2>
            <p className="thq-body-large">Every year around 1.35 million people are cut off due to numerous crashes in case of road traffic accident.
              As per the statistics 20 to 50 million people suffer as a result of its injuries. As a consequence of such
              traffic accidents people pays off their lives. These conditions are caused due to the lack of co-ordination
              among the organizations involving in it. Also not properly practising the rules and ways as it to be
              followed magnifies the graph upwards. The risk factors include speeding, drink and drive, distraction in
              driving, bad infrastructure, improper vehicles, breaking rules and many more. As such a system is needed
              which is perfectly able to coordinate between the different actions that is to be taken for the quick
              response at the accident location.Hence, we are able to correctly
              predict and report an accident and take necessary actions accordingly.
            </p>
          </div>
          <div className="steps-container2">
            <div className="steps-container3 thq-card">
              <h2 className="thq-heading-2">{props.step1Title}</h2>
              <span className="steps-text04 thq-body-small">
                {props.step1Description}
              </span>
              <label className="steps-text05 thq-heading-3">01</label>
            </div>
            <div className="steps-container4 thq-card">
              <h2 className="thq-heading-2">{props.step2Title}</h2>
              <span className="steps-text07 thq-body-small">
                {props.step2Description}
              </span>
              <label className="steps-text08 thq-heading-3">02</label>
            </div>
            <div className="steps-container5 thq-card">
              <h2 className="thq-heading-2">{props.step3Title}</h2>
              <span className="steps-text10 thq-body-small">
                {props.step3Description}
              </span>
              <label className="steps-text11 thq-heading-3">03</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

Steps.defaultProps = {
  step1Description:
    'Select the option to upload an image of the vehicle accident scene.',
  step3Description:
    'Select the option to record a live video of the vehicle accident scene.',
  step2Title: 'Choose Upload Video',
  step2Description:
    'Select the option to upload a video recording of the vehicle accident.',
  step1Title: 'Choose Upload Image',
  step3Title: 'Record Live Video',
  }

Steps.propTypes = {
  step1Description: PropTypes.string,
  step3Description: PropTypes.string,
  step2Title: PropTypes.string,
  step2Description: PropTypes.string,
  step1Title: PropTypes.string,
  step3Title: PropTypes.string,
}

export default Steps
