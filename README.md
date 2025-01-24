# Reader6160

Reader6160 is a tiny script that downloads the most recent data from the Marvel API for the series set in the 6160 universe.
Its purpose is to help instruct potential 6160-readers on which comics to purchase and in what series they belong.

The latest output of the script is currently stored in `docs` but, as per the requirements on the official Marvel API usage, this app will not cache the data indefinitely.
Instead, this repository is setup to run once every 24 hours to run the script and update the data as necessary.

Data provided by Marvel. © 2025 MARVEL

## Installation

### Setting Up Secrets
Create an account a Marvel Developer Portal account.
Obtain your public key and private key.
Store them in the environment variables `API_PRIVATE_KEY` and `API_PUBLIC_KEY`.
Obtain the Marvel Developer Portal API gateway URL.
Store that value in the environment variable `API_URL`.

### Setting Up Code
Clone this repository.

## Usage

Run `index.js`.


```bash
$ node index.js
```

The script will update the `docs/data.json` and `docs/meta.json` files if necessary.

## License

[MIT](https://choosealicense.com/licenses/mit/)