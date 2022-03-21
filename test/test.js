// eslint-disable-next-line no-shadow -- Familiar API
import fetch from 'node-fetch';

import spawnPromise from './utils/spawnPromise.js';

const binPath = './Node/bin/index.js';

const basicUrl = 'http://127.0.0.1:1337';

describe('Retrieval', function () {
  this.timeout(20000);

  it('Gets baseline HTML', async function () {
    let cliProm;
    // eslint-disable-next-line promise/avoid-new -- Control
    const {html} = await new Promise((resolve, reject) => {
      cliProm = spawnPromise(binPath, [], 10000, async (stdout) => {
        if (stdout.includes('1337')) {
          try {
            const res = await fetch(basicUrl);
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

    expect(stdout).to.equal('Server running at 127.0.0.1:1337/\n');

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
      cliProm = spawnPromise(binPath, [], 10000, async (stdout) => {
        if (stdout.includes('1337')) {
          try {
            const res = await fetch(basicUrl, {
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

    expect(stdout).to.equal('Server running at 127.0.0.1:1337/\n');

    expect(stderr).to.equal('');

    expect(html).to.equal(
      `<b a="y">World</b>`
    );
  });
});
