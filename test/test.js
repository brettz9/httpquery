// eslint-disable-next-line no-shadow -- Familiar API
import fetch from 'node-fetch';

import spawnPromise from './utils/spawnPromise.js';

const binPath = './Node/bin/index.js';

describe('Retrieval', function () {
  this.timeout(20000);

  let port = 8090;
  const getUrl = () => {
    return ['http://127.0.0.1:' + (++port), port];
  };

  beforeEach(function () {
    [this.basicUrl, this.port] = getUrl();
  });

  it('Gets baseline HTML', async function () {
    let cliProm;
    // eslint-disable-next-line promise/avoid-new -- Control
    const {html} = await new Promise((resolve, reject) => {
      cliProm = spawnPromise(binPath, [this.port], 5000, async (stdout) => {
        if (stdout.includes(this.port)) {
          try {
            const res = await fetch(this.basicUrl);
            resolve(
              {html: await res.text()}
            );
          } catch (err) {
            reject(err);
          }
        }
      });
    });
    const {stdout, stderr} = await cliProm;

    expect(stdout).to.equal(`Server running at 127.0.0.1:${this.port}/\n`);

    expect(stderr).to.equal('');

    expect(html).to.equal(
      `<div>
<b>Hello</b>
<b a="x">my</b>
<i>dear</i>
<b a="y">World</b>
</div>`
    );
  });

  it('Gets CSS selector HTML', async function () {
    let cliProm;
    // eslint-disable-next-line promise/avoid-new -- Control
    const {html} = await new Promise((resolve, reject) => {
      cliProm = spawnPromise(binPath, [this.port], 5000, async (stdout) => {
        if (stdout.includes(this.port)) {
          try {
            const res = await fetch(this.basicUrl, {
              headers: {
                'query-request-css3': 'b[a=y]'
              }
            });
            resolve(
              {html: await res.text()}
            );
          } catch (err) {
            reject(err);
          }
        }
      });
    });
    const {stdout, stderr} = await cliProm;

    expect(stdout).to.equal(`Server running at 127.0.0.1:${this.port}/\n`);

    expect(stderr).to.equal('');

    expect(html).to.equal(
      `<b a="y">World</b>`
    );
  });

  it('Gets XPath selector HTML', async function () {
    let cliProm;
    // eslint-disable-next-line promise/avoid-new -- Control
    const {html} = await new Promise((resolve, reject) => {
      cliProm = spawnPromise(binPath, [this.port], 5000, async (stdout) => {
        if (stdout.includes(this.port)) {
          try {
            const res = await fetch(this.basicUrl, {
              headers: {
                'query-request-xpath1': '//@a'
              }
            });
            resolve(
              {html: await res.text()}
            );
          } catch (err) {
            reject(err);
          }
        }
      });
    });
    const {stdout, stderr} = await cliProm;

    expect(stdout).to.equal(`Server running at 127.0.0.1:${this.port}/\n`);

    expect(stderr).to.equal('');

    expect(html).to.equal(
      ` a="x" a="y"`
    );
  });

  it('Gets JSONPath selector JSON', async function () {
    const [jsonUrl, jsonPort] = getUrl();

    let cliProm;
    // eslint-disable-next-line promise/avoid-new -- Control
    const {html} = await new Promise((resolve, reject) => {
      cliProm = spawnPromise(binPath, [jsonPort], 5000, async (stdout) => {
        if (stdout.includes(jsonPort)) {
          try {
            const res = await fetch(jsonUrl + '/index.json', {
              headers: {
                'query-request-jsonpath': '$..jkl'
              }
            });
            resolve(
              {html: await res.text()}
            );
          } catch (err) {
            reject(err);
          }
        }
      });
    });
    const {stdout, stderr} = await cliProm;

    expect(stdout).to.equal(`Server running at 127.0.0.1:${jsonPort}/\n`);

    expect(stderr).to.equal('');

    expect(html).to.equal(
      `[true,false]`
    );
  });
});
