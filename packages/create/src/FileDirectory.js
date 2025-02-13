// @ts-check

import fs from 'fs';
import path from 'upath';

import { copyDir, copyFile } from './utils/copy.js';
import { emptyDir } from './utils/emptyDir.js';

export class FileDirectory {
  /**
   * @param {string} dir
   */
  constructor(dir) {
    /** @type {string} @readonly */
    this.path = dir;
    this.make();
  }

  make() {
    if (!fs.existsSync(this.path)) {
      fs.mkdirSync(this.path, { recursive: true });
    }
  }

  empty() {
    if (fs.existsSync(this.path)) {
      emptyDir(this.path);
    }
  }

  /**
   * @param  {string[]} pathSegments
   */
  resolve(...pathSegments) {
    return path.resolve(this.path, ...(pathSegments ?? []));
  }

  /**
   * @param {string} filePath
   * @param {string} content
   * @param {{ overwrite?: boolean }} [options]
   */
  writeFile(filePath, content, { overwrite = false } = {}) {
    if (overwrite || !fs.existsSync(this.resolve(filePath))) {
      fs.writeFileSync(this.resolve(filePath), content);
    }
  }

  /**
   * @param {string} filePath
   * @param {string} content
   */
  appendFile(filePath, content) {
    fs.appendFileSync(this.resolve(filePath), content);
  }

  /**
   * @param {string} filePath
   */
  deleteFile(filePath) {
    if (fs.existsSync(this.resolve(filePath))) {
      fs.unlinkSync(this.resolve(filePath));
    }
  }

  /**
   * @param {string} filePath
   */
  exists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * @param {string} srcPath
   * @param {string|FileDirectory} destPath
   * @param {{ replace?: Record<string, string> }} [options]
   */
  copyFile(srcPath, destPath, { replace } = {}) {
    copyFile(
      this.resolve(srcPath),
      typeof destPath === 'string' ? destPath : destPath.resolve(srcPath),
      { replace },
    );
  }

  /**
   * @param {string} srcPath
   * @param {string|FileDirectory} destPath
   */
  copyDir(srcPath, destPath) {
    copyDir(
      this.resolve(srcPath),
      typeof destPath === 'string' ? destPath : destPath.path,
    );
  }
}
