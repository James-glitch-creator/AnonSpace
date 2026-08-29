import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server refuses cross-origin requests to /_next/* assets and HMR by
  // default, allowing only "localhost". Without this, opening the app from another
  // device's LAN IP loads the HTML shell but React never hydrates (script/HMR
  // requests get silently 403'd), so the page looks static: buttons don't call their
  // onClick handlers and forms fall back to a native, no-op submit. These patterns
  // cover the common private-network ranges (192.168.x.x, 10.x.x.x, 172.x.x.x) so it
  // keeps working across whatever IP DHCP hands this machine.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
