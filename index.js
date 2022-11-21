import { ethers } from "ethers";
import abi from "./abi/abi.json" assert { type: "json" };
import fs from "fs";
import { NFTStorage, File } from "nft.storage";
import * as dotenv from "dotenv";
dotenv.config();
const nftstorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });
import test_input from "./test-model-input.json" assert { type: "json" };
import Jimp from "jimp";

async function postPrediction(prediction) {
    const output = await fetch("http://localhost:8501/v1/models/test-model:predict", {
        method: "POST",
	headers: {
	    "Content-Type": "application/json"
	},
	body: JSON.stringify(prediction)
    })
    return output.json();
}

async function uploadImage(image, tokenID, who = undefined) {
    return nftstorage.store({
        image,
	name: `SCAiPES#${tokenID}`,
	description: "Description!",
	website: "https://google.com/",
	burned: `${typeof who !== "undefined"}`,
	burner: who
    });
}

function convertImg(input, tokenID) {
    new Jimp(1280, 720, (err, image) => {
        for (let i = 0; i < 720; i++) {
            for (let j = 0; j < 1280; j++) {
                var pred = input.predictions[0][i][j];
                for (let k = 0; k < 3; k++) {
                    pred[k]++;
                    pred[k] *= 127.5;
                    pred[k] = Math.round(pred[k])
                }
                image.setPixelColor(Jimp.rgbaToInt(pred[0], pred[1], pred[2], 255), j, i);
            }
        }
	image.write(`./images/${tokenID}.png`);
    });
}

async function uploadNewPrediction(tokenID) {
    var image_res = await postPrediction(test_input);
    convertImg(image_res, tokenID);
    var output = fs.readFile(`./images/${tokenID}.png`, async (err, image) => {
        var image = new File([output], "image.png", { type: "image/png" });
        var cid = await uploadImage(image, tokenID);
	console.log(cid);
    });
}

async function main() {
    const address = "0x47AE92283cd7066a11f91D11d33c92A6A77e5bdF";
    const provider = new ethers.providers.AlchemyProvider("goerli", process.env.ALCHEMY_KEY);
    const contract = new ethers.Contract(address, abi, provider);
    
    // Make a prediction and get an image from the output
    uploadNewPrediction("Test");

    contract.on("mint", (_tokenId, _who, event) => {
        uploadNewPrediction(_tokenId);
	console.log(`Minted ${_tokenId} for ${_who}`);
    });
}

main();
