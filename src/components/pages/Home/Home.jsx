import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import s from './Home.module.scss';

const Home = ({className}) => {
	return (
		<div className={cx(s.root, className)}></div>
	)
}

Home.propTypes = {
	className: PropTypes.string,
}

Home.defaultProps = {}

export default React.memo(Home);