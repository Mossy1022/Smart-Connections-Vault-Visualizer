import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
// if directory doesn't exist, create it
if(!fs.existsSync(path.join(process.cwd(), 'dist'))) {
  fs.mkdirSync(path.join(process.cwd(), 'dist'), { recursive: true });
}
(async () => {

  await esbuild.build({
    entryPoints: ['./clusters_visualizer.js'],
    outfile: './dist/clusters_visualizer.js',
    bundle: true,
    format: 'esm',   // or 'iife' if you prefer
    platform: 'node',
    sourcemap: true,
    external: ['obsidian'], 
    // ^ if you want to load d3 from a CDN or external script. 
    //   Otherwise remove from external and `npm install d3` to bundle it fully.
  
    // watch: true, // if you want watch mode
  });

  console.log('clusters_visualizer build success');
  
  const main_path = path.join(process.cwd(), 'dist', 'main.js');
  const manifest_path = path.join(process.cwd(), 'manifest.json');
  const styles_path = path.join(process.cwd(), 'styles.css');
  // Update manifest.json version
  const package_json = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')));
  const manifest_json = JSON.parse(fs.readFileSync(manifest_path));
  manifest_json.version = package_json.version;
  fs.writeFileSync(manifest_path, JSON.stringify(manifest_json, null, 2));
  // copy manifest and styles to dist
  fs.copyFileSync(manifest_path, path.join(process.cwd(), 'dist', 'manifest.json'));
  fs.copyFileSync(styles_path, path.join(process.cwd(), 'dist', 'styles.css'));
  
  const destination_vaults = process.env.DESTINATION_VAULTS.split(',');
  
  // get first argument as entry point
  const entry_point = process.argv[2] || 'plugin.js';
  
  // Build the project
  await esbuild.build({
    entryPoints: [entry_point],
    outfile: 'dist/main.js',
    format: 'cjs',
    bundle: true,
    write: true,
    sourcemap: 'inline',
    target: "es2022",
    logLevel: "info",
    treeShaking: true,
    platform: 'node',
    preserveSymlinks: true,
    external: [
      'electron',
      'obsidian',
      '@codemirror/view',
      '@codemirror/state',
      'crypto',
    ],
    define: {
    },
  })
    console.log('Build complete');
    // Copy the dist folder to ./DESTINATION_VAULT/.obsidian/plugins/smart-connections/
    const release_file_paths = [manifest_path, styles_path, main_path];
    for(let vault of destination_vaults) {
      const destDir = path.join(process.cwd(), '..', vault, '.obsidian', 'plugins', 'smart-visualizer');
      console.log(`Copying files to ${destDir}`);
      fs.mkdirSync(destDir, { recursive: true });
      // create .hotreload file if it doesn't exist
      if(!fs.existsSync(path.join(destDir, '.hotreload'))) {
        fs.writeFileSync(path.join(destDir, '.hotreload'), '');
      }
      release_file_paths.forEach(file_path => {
        fs.copyFileSync(file_path, path.join(destDir, path.basename(file_path)));
      });
      console.log(`Copied files to ${destDir}`);
    }
})();
