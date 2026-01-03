import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Явно указываем корневую директорию для Turbopack
  // Это решает проблему с неправильным определением workspace root
  // когда обнаружено несколько package-lock.json файлов
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
