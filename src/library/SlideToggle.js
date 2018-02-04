/*
  _state_ is internal state for sync and rendering control.
  setState is async and I need sync control because timing is important 
  and because I need to control what is to be re-rendered.
*/

import React from 'react'; // eslint-disable-line import/no-extraneous-dependencies
// import PropTypes from 'prop-types'; // eslint-disable-line import/no-extraneous-dependencies

// Support browser or node env
const root = typeof window !== 'undefined' ? window : global;
const rAF = root.requestAnimationFrame
  ? root.requestAnimationFrame.bind(root)
  : callback => root.setTimeout(callback, 16);
const cAF = root.cancelAnimationFrame
  ? root.cancelAnimationFrame.bind(root)
  : root.clearInterval.bind(root);

const TOGGLE = {
  EXPANDED: 'EXPANDED',
  COLLAPSED: 'COLLAPSED',
  EXPANDING: 'EXPANDING',
  COLLAPSING: 'COLLAPSING',
};
const GET_HEIGHT = 'offsetHeight';

const easeInOutCubic = t =>
  t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;

const util = {
  isMoving: toggleState =>
    toggleState === TOGGLE.EXPANDING || toggleState === TOGGLE.COLLAPSING,
  now: () => new Date().getTime(),
  sanitizeDuration: duration => Math.max(0, parseInt(+duration, 10) || 0),
};

class SlideToggle extends React.Component {
  static defaultProps = {
    duration: 300,
    easeCollapse: easeInOutCubic,
    easeExpand: easeInOutCubic,
    ease: easeInOutCubic,
  };

  // static propTypes = {
  //   render: PropTypes.func,
  //   duration: PropTypes.number,
  //   noDisplayStyle: PropTypes.bool,
  //   easeCollapse: PropTypes.func,
  //   easeExpand: PropTypes.func,
  //   collapsed: PropTypes.bool,
  // };

  constructor(props) {
    super(props);

    this._state_ = {
      collasibleElement: null,
      toggleState: this.props.collapsed ? TOGGLE.COLLAPSED : TOGGLE.EXPANDED,
    };

    this.state = {
      toggleState: this._state_.toggleState,
    };
  }

  render() {
    const data = {
      onToggle: this.onToggle,
      setCollapsibleElement: this.setCollapsibleElement,
      toggleState: this.state.toggleState,
      isMoving: util.isMoving(this.state.toggleState),
    };

    return this.props.render ? this.props.render(data) : null;
  }

  setCollapsibleElement = element => {
    this._state_.collasibleElement = element;
    this._state_.boxHeight = element[GET_HEIGHT];

    if (this._state_.toggleState === TOGGLE.COLLAPSED) {
      this.setCollapsedState({ initialState: true });
    } else if (this._state_.toggleState === TOGGLE.EXPANDED) {
      this.setExpandedState({ initialState: true });
    }
  };

  onToggle = () => {
    const invokeCollapsing = () => {
      this.collapse();
    };
    const invokeExpanding = () => {
      this.expand();
    };

    const updateInternalState = ({ toggleState, display }) => {
      this._state_.toggleState = toggleState;

      if (display !== undefined && !this.props.noDisplayStyle) {
        this._state_.collasibleElement.style.display = display;
      }

      this._state_.boxHeight = this._state_.collasibleElement[GET_HEIGHT];
      this._state_.startTime = util.now();
      this._state_.startDirection = toggleState;

      this.setState({
        toggleState: this._state_.toggleState,
      });
    };

    if (this._state_.toggleState === TOGGLE.EXPANDED) {
      updateInternalState({ toggleState: TOGGLE.COLLAPSING });
      invokeCollapsing();
    } else if (this._state_.toggleState === TOGGLE.COLLAPSED) {
      updateInternalState({
        toggleState: TOGGLE.EXPANDING,
        display: '',
      });
      invokeExpanding();
    } else if (this._state_.toggleState === TOGGLE.EXPANDING) {
      updateInternalState({
        toggleState: TOGGLE.COLLAPSING,
      });
      invokeCollapsing();
    } else if (this._state_.toggleState === TOGGLE.COLLAPSING) {
      updateInternalState({
        toggleState: TOGGLE.EXPANDING,
        display: '',
      });
      invokeExpanding();
    }
  };

  setExpandedState = () => {
    this._state_.collasibleElement.style.height = null;
    this._state_.toggleState = TOGGLE.EXPANDED;
    this.setState({
      toggleState: TOGGLE.EXPANDED,
    });
  };

  expand = () => {
    if (this._state_.toggleState !== TOGGLE.EXPANDING) {
      return;
    }

    const duration = util.sanitizeDuration(this.props.duration);
    if (duration <= 0) {
      this.setExpandedState();
      return;
    }

    const { startTime } = this._state_;
    const elapsedTime = Math.min(duration, util.now() - startTime);

    if (elapsedTime >= duration) {
      this.setExpandedState();
    } else {
      const { boxHeight } = this._state_;
      const range = elapsedTime / duration;

      const progress = this.props.easeExpand(range);
      const currentHeightValue = Math.round(boxHeight * progress);
      this._state_.collasibleElement.style.height = `${currentHeightValue}px`;
      this.nextTick(this.expand);
    }
  };

  setCollapsedState = () => {
    if (!this.props.noDisplayStyle) {
      this._state_.collasibleElement.style.display = 'none';
    }
    this._state_.collasibleElement.style.height = null;
    this._state_.toggleState = TOGGLE.COLLAPSED;
    this.setState({
      toggleState: TOGGLE.COLLAPSED,
    });
  };

  collapse = () => {
    if (this._state_.toggleState !== TOGGLE.COLLAPSING) {
      return;
    }
    const duration = util.sanitizeDuration(this.props.duration);
    if (duration <= 0) {
      this.setCollapsedState();
      return;
    }

    const { startTime } = this._state_;
    const elapsedTime = Math.min(duration, util.now() - startTime);

    if (elapsedTime >= duration) {
      this.setCollapsedState();
    } else {
      const { boxHeight } = this._state_;
      const range = 1 - elapsedTime / duration;

      const { easeCollapse } = this.props;

      const progress = 1 - easeCollapse(1 - range);

      const currentHeightValue = Math.round(boxHeight * progress);
      this._state_.collasibleElement.style.height = `${currentHeightValue}px`;
      this._state_.timeout = this.nextTick(this.collapse);
    }
  };

  nextTick = callback => {
    this._state_.timeout = rAF(callback);
  };

  componentWillUnmount() {
    cAF(this._state_.timeout);
  }
}

module.exports = SlideToggle;