import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import {
    createStorageService
} from '../../src/services/storage.service.js'

test('uploadFile sube a S3 y devuelve storageKey', async () => {
    const calls = []
    const fakeClient = {
        async send(command) {
            calls.push(command)
            return {}
        }
    }

    const service = createStorageService({
        client: fakeClient,
        bucket: 'bucket-test',
        region: 'us-east-1',
        signer: async () => 'https://signed.example.com/file'
    })

    const result = await service.uploadFile({
        namespace: 'patients-studies',
        name: 'radiografia.png',
        mime: 'image/png',
        data: Buffer.from('hola-s3').toString('base64')
    })

    assert.equal(calls.length, 1)
    assert.equal(calls[0].constructor.name, 'PutObjectCommand')
    assert.equal(calls[0].input.Bucket, 'bucket-test')
    assert.equal(calls[0].input.ContentType, 'image/png')
    assert.match(calls[0].input.Key, /^patients-studies\/\d{4}\/\d{2}\/.+-radiografia\.png$/)
    assert.equal(result.sizeBytes, Buffer.byteLength('hola-s3'))
    assert.equal(result.storageKey, calls[0].input.Key)
})

test('getFileUrl genera URL firmada', async () => {
    const service = createStorageService({
        client: { send: async () => ({}) },
        bucket: 'bucket-test',
        region: 'us-east-1',
        signer: async (_client, command, options) => {
            assert.equal(command.constructor.name, 'GetObjectCommand')
            assert.equal(command.input.Bucket, 'bucket-test')
            assert.equal(command.input.Key, 'implants/2026/04/archivo.pdf')
            assert.equal(options.expiresIn, 120)
            return 'https://signed.example.com/file'
        }
    })

    const url = await service.getFileUrl({
        storageKey: 'implants/2026/04/archivo.pdf',
        expiresIn: 120
    })

    assert.equal(url, 'https://signed.example.com/file')
})

test('getFileBase64 lee archivo desde S3', async () => {
    const fakeClient = {
        async send(command) {
            assert.equal(command.constructor.name, 'GetObjectCommand')
            return {
                Body: Readable.from(Buffer.from('contenido'))
            }
        }
    }

    const service = createStorageService({
        client: fakeClient,
        bucket: 'bucket-test',
        region: 'us-east-1',
        signer: async () => ''
    })

    const base64 = await service.getFileBase64({
        storageKey: 'patients-studies/2026/04/archivo.txt'
    })

    assert.equal(base64, Buffer.from('contenido').toString('base64'))
})
