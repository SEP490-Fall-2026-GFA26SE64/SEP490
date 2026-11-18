// ExcelJS needs hashing and random bytes for worksheet protection, rather than
// the full Node crypto implementation (including its VM/eval dependencies).
import createHash from 'create-hash'
import randomBytes from 'randombytes'

export { createHash, randomBytes }
export const getHashes = () => ['sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'md5', 'ripemd160']
