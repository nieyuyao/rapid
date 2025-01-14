'use strict';

const Util = require('./util');
const { tarBucketsDir, npmCacheConfigPath, npmIndexConfigPath } = require('./constants');
const os = require('node:os');

const platform = os.platform();
const arch = os.arch();

class Downloader {
  /**
   * @param {object} options -
   * @param {number} [options.bucketCount] -
   * @param {number} [options.downloadTimeout] -
   * @param {number} [options.httpConcurrentCount] -
   * @param {NodeJS.Platform} [options.platform] -
   * @param {NodeJS.Architecture} [options.arch] -
   * @param {boolean} [options.productionMode] -
   * @param {{function(*)}} [options.entryListener] -
   */
  constructor(options) {
    this.entryListener = options.entryListener;
    this.bucketCount = options.bucketCount || 40;
    this.downloadTimeout = options.downloadTimeout || 2 * 60 * 1000;
    this.httpConcurrentCount = options.httpConcurrentCount || 20;
    this.platform = options.platform || platform;
    this.arch = options.arch || arch;
    this.productionMode = options.productionMode;
    this.rapidDownloader = this.createRapidDownloader();
    this.taskMap = new Map();
    this._dumpData = null;
  }

  async init() {
    await this.rapidDownloader.init();
  }

  async shutdown() {
    if (!this.rapidDownloader) return;
    await this.rapidDownloader.shutdown();
  }

  createRapidDownloader() {
    const { Downloader } = require('@cnpmjs/binding');
    return new Downloader({
      bucketCount: this.bucketCount,
      httpConcurrentCount: this.httpConcurrentCount,
      downloadDir: tarBucketsDir,
      entryWhitelist: [ '*/package.json', '*/binding.gyp' ],
      entryListener: this.entryListener,
      downloadTimeout: this.downloadTimeout,
      tocPath: {
        map: npmCacheConfigPath,
        index: npmIndexConfigPath,
      },
    });
  }

  async download(pkgLockJson) {
    const tasks = this.createDownloadTask(pkgLockJson);
    await this.rapidDownloader.batchDownloads(tasks);
  }

  get dumpdata() {
    if (!this._dumpData) {
      this._dump();
    }
    return this._dumpData;
  }

  _dump() {
    const dataStr = this.rapidDownloader.dump();
    this._dumpData = JSON.parse(dataStr);
  }

  async getTocIndices() {
    const { tocMap } = this.dumpdata;
    return tocMap;
  }

  async downloadPkg(pkg) {
    const { name, version } = pkg;
    const taskId = Util.generatePackageId(name, version);
    const task = {
      id: taskId,
      name,
      version,
      sha: pkg.integrity || pkg._integrity,
      url: pkg.resolved || pkg._resolved,
      pkg,
    };
    return await this.doDownloadTask(task);
  }

  createDownloadTask(pkgLockJson) {
    const taskMap = new Map();
    for (const [ name, pkg ] of Object.entries(pkgLockJson.packages)) {
      // 根目录忽略，软链接忽略，workspace 子包忽略
      if (name === '' || pkg.link === true || (!pkg.resolved && !pkg.link)) continue;
      const pkgName = Util.getPkgNameFromTarballUrl(pkg.resolved);
      const taskId = Util.generatePackageId(pkgName, pkg.version);
      if (taskMap.has(taskId)) {
        // 如果 semver@6.3.0 dev 来覆盖 semver@6.3.0 production 就非法
        // TODO --omit=optional 现在整个链路都未消费，暂时不处理
        if (taskMap.get(taskId).pkg.dev !== true) {
          continue;
        }
      }
      taskMap.set(taskId, {
        id: taskId,
        name: pkgName,
        version: pkg.version,
        sha: pkg.integrity,
        url: pkg.resolved,
        pkg,
      });
    }
    const tasks = Array.from(taskMap.values());
    return tasks.filter(task =>
      Util.validDep(task.pkg, this.productionMode, this.arch, this.platform)
    );
  }

  async doDownloadTask(task) {
    let { downloadTask } = this.taskMap.get(task.id) || {};
    if (downloadTask) {
      return downloadTask;
    }
    downloadTask = this.rapidDownloader.download(task);
    this.taskMap.set(task.id, {
      downloadTask,
      task,
    });
    try {
      const result = await downloadTask;
      return result;
    } catch (e) {
      task.retryTime = (task.retryTime || 0) + 1;
      if (task.retryTime > 3) {
        throw e;
      } else {
        console.log('retry task %j', task);
        this.taskMap.delete(task.id);
        return this.doDownloadTask(task);
      }
    }
  }
}

module.exports = Downloader;
