'use strict';

const assert = require('node:assert');
const NpmFs = require('../lib/npm_fs');
const {
  NpmFsMode,
} = require('../lib/constants');
const BlobManager = require('../lib/npm_blob_manager');
const TestUtil = require('./fixtures/util');
const path = require('node:path');
const os = require('node:os');
const mm = require('mm');

describe('test/npm_fs.test.js', () => {
  let fixtureDir;
  let pkgLockJson;
  let depPkgs;
  let blobs;
  let blobManager;
  let tarIndexJson;
  let tnpmTarIndexJson;

  const uid = 500;
  const gid = 505;

  async function prepareBlobManager() {
    pkgLockJson = await TestUtil.readFixtureJson(fixtureDir, 'package-lock.json');
    blobs = await TestUtil.readFixtureJson(fixtureDir, 'npm.config.json');
    tarIndexJson = await TestUtil.readFixtureJson(fixtureDir, 'tar.index.json');
    tnpmTarIndexJson = await TestUtil.readFixtureJson(fixtureDir, 'tnpm.tar.index.json');

    blobManager = new BlobManager();
    for (const [ blobId, tocIndex ] of Object.entries(blobs)) {
      blobManager.addBlob(blobId, tocIndex);
    }
    for (const pkg of depPkgs) {
      blobManager.addPackage(pkg);
    }
  }

  describe('npm fs', () => {
    const defaultOptions = {
      uid,
      gid,
    };

    describe('one package', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/one_package';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });

    describe('package has bin', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_has_bin';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });

    describe('flatten package', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/flatten_package';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.set.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });

    describe('nest package', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/nest_package';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.set.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.foo.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });

    describe('multi blob', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/multi_blob';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.set.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });

    describe('production package', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/production_package';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.has.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, {
          ...defaultOptions,
          productionMode: true,
        });
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });

    describe('package has bundled deps', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_bundled_deps';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, '@alipay_tnpm-scripts-test@1.0.6.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });

    describe('package has alias', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_has_alias';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, '@alipay_tnpm-scripts-test@1.0.9.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.has.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });

    describe('package bin file mode', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_bin_file_mode';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'atob@2.1.2.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });

    describe('esbuild', () => {
      beforeEach(async () => {
        mm(os, 'arch', () => 'x64');
        mm(os, 'platform', () => 'linux');
        mm(process, 'arch', 'x64');
        mm(process, 'platform', 'linux');
        fixtureDir = 'npm_fs/esbuild';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'esbuild.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'esbuild-linux-64.package.json'),
        ]);
        await prepareBlobManager();
      });

      afterEach(mm.restore);

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tarIndexJson);
      });
    });
  });

  describe('npm fs with workspace', () => {
    const defaultOptions = {
      uid,
      gid,
    };

    describe('workspace with duplicate pkgs', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/workspace';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.has.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.chunk.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.has.4.5.1.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, {
          ...defaultOptions,
          cwd: path.join(__dirname, 'fixtures', fixtureDir),
          pkg: await TestUtil.readFixtureJson(fixtureDir, 'package.json'),
        });
        // cwd
        const rootFSMeta = await npm.getFsMeta(pkgLockJson, '');
        assert.deepStrictEqual(rootFSMeta, tarIndexJson);
        // packages/a
        const aFSMeta = await npm.getFsMeta(pkgLockJson, 'packages/a');
        const aTarIndexJson = await TestUtil.readFixtureJson(fixtureDir, 'tar.a.index.json');
        assert.deepStrictEqual(aFSMeta, aTarIndexJson);
        // packages/b
        const bFSMeta = await npm.getFsMeta(pkgLockJson, 'packages/b');
        const bTarIndexJson = await TestUtil.readFixtureJson(fixtureDir, 'tar.b.index.json');
        assert.deepStrictEqual(bFSMeta, bTarIndexJson);
      });
    });
  });

  describe('tnpm fs', () => {
    const defaultOptions = {
      uid,
      gid,
      mode: NpmFsMode.NPMINSTALL,
    };

    describe('one package', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/one_package';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('package has bin', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_has_bin';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('package has alias', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_has_alias';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, '@alipay_tnpm-scripts-test@1.0.9.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.has.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('package sub dep has bin', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_has_sub_bin';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, '@alipay_gemwuu-1@1.0.2.package.json'),
          TestUtil.readFixtureJson(fixtureDir, '@alipay_tnpm-scripts-test@1.0.2.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'uuid@7.0.3.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'uuid@8.3.2.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('package bin file mode', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_bin_file_mode';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'atob@2.1.2.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('package has dev bin', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_dev_bin';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, '@alipay_tnpm-scripts-test@1.0.5.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('package bin is a string', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_string_bin';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, '@alipay_tnpm-scripts-test@1.0.4.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'uuid@8.3.2.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });


    describe('package has bundled deps', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/package_bundled_deps';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, '@alipay_tnpm-scripts-test@1.0.6.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('flatten package', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/flatten_package';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.set.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('nest package', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/nest_package';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.set.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.foo.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('multi blob', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/multi_blob';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.set.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('produciton package', () => {
      beforeEach(async () => {
        fixtureDir = 'npm_fs/production_package';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'lodash.get.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'lodash.has.package.json'),
        ]);
        await prepareBlobManager();
      });

      it('should work', async () => {
        const npm = new NpmFs(blobManager, {
          ...defaultOptions,
          productionMode: true,
        });
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });

    describe('esbuild', () => {
      beforeEach(async () => {
        mm(os, 'arch', () => 'x64');
        mm(os, 'platform', () => 'linux');
        mm(process, 'arch', 'x64');
        mm(process, 'platform', 'linux');
        fixtureDir = 'npm_fs/esbuild';
        depPkgs = await Promise.all([
          TestUtil.readFixtureJson(fixtureDir, 'esbuild.package.json'),
          TestUtil.readFixtureJson(fixtureDir, 'esbuild-linux-64.package.json'),
        ]);
        await prepareBlobManager();
      });
      afterEach(mm.restore);

      it('should work', async () => {
        const npm = new NpmFs(blobManager, defaultOptions);
        const fsMeta = await npm.getFsMeta(pkgLockJson);
        assert.deepStrictEqual(fsMeta, tnpmTarIndexJson);
      });
    });
  });
});
