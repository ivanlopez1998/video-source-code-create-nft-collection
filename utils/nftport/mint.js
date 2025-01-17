const fetch = require("node-fetch");
const path = require("path");
const basePath = process.cwd();
const fs = require("fs");

const AUTH = 'YOUR API KEY HERE';
const CONTRACT_ADDRESS = 'YOUR CONTRACT ADDRESS HERE';
const MINT_TO_ADDRESS = 'YOUR WALLET ADDRESS HERE';
const CHAIN = 'rinkeby';
const TIMEOUT = 5000; // Milliseconds. This a timeout for errors only. If there is an error, it will wait then try again. 5000 = 5 seconds.
const mintedArray = [];

if (!fs.existsSync(path.join(`${basePath}/build`, "/minted"))) {
  fs.mkdirSync(path.join(`${basePath}/build`, "minted"));
}

async function main() {
  const ipfsMetas = JSON.parse(
    fs.readFileSync(`${basePath}/build/json/_ipfsMetas.json`)
  );

  for (const meta of ipfsMetas) {
    try {
      let mintData = await fetchWithRetry(meta)
      mintedArray.push(mintData);
      console.log(`Minted: ${meta.name}`);
      const combinedData = {
        metaData: meta,
        mintData: mintData
      }
      writeMintData(meta.custom_fields.edition, combinedData)
    } catch(err) {
      console.log(err)
    }
  }
}

main();

async function fetchWithRetry(meta)  {
  return new Promise((resolve, reject) => {
    let numberOfRetry = 10;
    let attempts = 1;

    const fetch_retry = (_meta, _n) => {
      let url = "https://api.nftport.xyz/v0/mints/customizable";

      const mintInfo = {
        chain: CHAIN,
        contract_address: CONTRACT_ADDRESS,
        metadata_uri: _meta.metadata_uri,
        mint_to_address: MINT_TO_ADDRESS,
        token_id: _meta.custom_fields.edition,
      };

      let options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: AUTH,
        },
        body: JSON.stringify(mintInfo),
      };

      return fetch(url, options).then(res => {
          const status = res.status;

          if(status === 200) {
            return resolve(res.json());
          }            
          else if (_n === 1) {
            throw reject("Too many attempts.. Error in getting http data");                
          }
          else {
            console.log("Retry again: Got back " + status);
            console.log("With delay " + attempts * TIMEOUT);
            setTimeout(() => {
                attempts++;
                
                fetch_retry(_meta, _n - 1);                    
            }, attempts * TIMEOUT);
          }            
      }).catch(function (error) {            
          if (_n === 1) {
            reject(error)
          }
          else {
          setTimeout(() => {
              attempts++
              fetch_retry(_meta, _n - 1);
              }, attempts * TIMEOUT);
          }
      });
    }        
    return fetch_retry(meta, numberOfRetry);
  });
}

const writeMintData = (_edition, _data) => {
  fs.writeFileSync(`${basePath}/build/minted/${_edition}.json`, JSON.stringify(_data, null, 2));
};
