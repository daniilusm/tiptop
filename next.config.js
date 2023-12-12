/**
 * @format
 * @type {import('next').NextConfig}
 */

const path = require("path");

const nextConfig = {
  reactStrictMode: false,

  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
    prependData: `
      @use "styles/mixins.scss" as *; 
      @use "styles/helpers.scss" as *;
      @use "styles/colors.scss" as *;
      @use "styles/typography.scss" as *;
      @use "styles/media.scss" as *;
    `,
  },

  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
