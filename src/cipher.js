const forge = require('node-forge');
const pako = require('pako');

// eslint-disable-next-line max-len
const RSA_1024_MODULO = 'B99B77A3D72D3A29B4271FC7B7300E2F791EB8948174BE7B8024667E915446D4EEA0C2424B8D1EBF7E2DDFF94691C6E994E839225C627D140A8F1146D1B0B5F18A09BBD3D8F421CA1E3E4796B301EEBCCF80D81A32A1580121B8294433C38377083C5517D5921E8A078CDC019B15775292EFDA2C30251B1CCABE812386C893E5';
const RSA_1024_EXPONENT = '65537'

function initCipher(session)
{
    session.aesIV = generateIV();

    session.publicKey = forge.pki.rsa.setPublicKey(
        new forge.jsbn.BigInteger(RSA_1024_MODULO, 16),
        new forge.jsbn.BigInteger(RSA_1024_EXPONENT, 10)
    );
}

function cipher(session, data, { key, compress, disableIV } = {})
{
    data = forge.util.encodeUtf8('' + data);
    if (compress && !session.disableCompress) {
        data = deflate(data);
    }

    const cipher = createCipher(session, key, false, disableIV);
    cipher.update(new forge.util.ByteBuffer(data));

    return cipher.finish() && cipher.output.toHex();
}

function decipher(session, data, { compress, scrambled, key, asBytes } = {})
{
    const cipher = createCipher(session, key, true);
    cipher.update(new forge.util.ByteBuffer(forge.util.hexToBytes(data)));

    let result = cipher.finish() && cipher.output.bytes();
    if (compress && !session.disableCompress) {
        result = inflate(result);
    }

    result = forge.util.decodeUtf8(result);

    if (scrambled) {
        const unscrambled = new Array(result.length);
        for (let i = 0; i < result.length; i += 1) {
            if (i % 2 === 0) {
                unscrambled.push(result.charAt(i));
            }
        }

        return unscrambled.join('');
    }

    if (asBytes) {
        const buffer = new forge.util.ByteBuffer();
        const split = result.split(',');

        for (let i = 0; i < split.length; i++) {
            buffer.putInt(parseInt(split[i]), 8);
        }

        return buffer;
    }

    return result;
}

function createCipher(session, key, decipher, disableIV = false)
{
    if (!key) {
        key = session.aesKey || new forge.util.ByteBuffer();
    }

    const cipher = forge.cipher[decipher ? 'createDecipher' : 'createCipher']('AES-CBC', md5(key));
    const iv = disableIV ? forge.util.createBuffer('\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00') : md5(session.aesIV);

    cipher.start({ iv });

    return cipher;
}

function md5(buffer)
{
    return forge.md.md5.create().update(buffer.bytes()).digest();
}

function deflate(data)
{
    return pako.deflateRaw(new forge.util.ByteBuffer(data).toHex(), { level: 6, to: 'string' });
}

function inflate(data)
{
    return pako.inflateRaw(data, { to: 'string' });
}

function generateIV()
{
    return new forge.util.ByteBuffer(forge.random.getBytes(16));
}

function getUUID(session, iv)
{
    if (session.disableAES) {
        return forge.util.encode64(iv.bytes());
    }
    return forge.util.encode64(session.publicKey.encrypt(iv.bytes()));
}

function getLoginKey(username, password, scramble, fromCas)
{
    const hash = forge.md.sha256.create().update(scramble || '').update(forge.util.encodeUtf8(password)).digest();
    const key = (fromCas ? '' : username.toLowerCase()) + hash.toHex().toUpperCase();

    return new forge.util.ByteBuffer(forge.util.encodeUtf8(key));
}

module.exports = {
    initCipher,

    cipher,
    decipher,
    getUUID,
    getLoginKey
};
