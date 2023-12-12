import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import s from './Button.module.scss';

const Button = ({className}) => {
	return (
		<button className={cx(s.root, className)}>Кнопка</button>
	)
}

Button.propTypes = {
	className: PropTypes.string,
}
Button.defaultProps = {}

export default React.memo(Button);