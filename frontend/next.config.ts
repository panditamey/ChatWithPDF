import type { NextConfig } from "next";

const config: NextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default config;
