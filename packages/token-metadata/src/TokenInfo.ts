import { INJ_DENOM } from '@injectivelabs/utils'
import { canonicalChannelIds } from './ibc'
import { Token, TokenMeta, TokenType } from './types'

/**
 * Token info is a helper class which abstracts
 * away handling different versions of a Token
 * represented on Injective.
 *
 * Ex: USDC token
 * - For a peggy denom -> decimals 6, address: ERC20 contract address, symbol: USDC
 * - For a factory/cw20Denom: (both 6 decimals)
 *  -> if coming from Ethereum through Wormhole take USDCet as the cw20 addresses will match,
 *  -> if coming from Solana through Wormhole take USDCso as the cw20 addresses will match,
 *
 * Ex: SOL token
 * - For the native token on Solana -> decimals 9
 * - For the cw20 version of the native SOL token on Injective through wormhole -> decimals 8
 *
 * Ex: CHZ token
 * - For the peggy denom -> decimals 18
 * - For a factory/cw20Denom:
 *  -> For CHZ coming through Wormhole from Ethereum -> decimals 8
 */
export class TokenInfo {
  public denom: string

  public meta: TokenMeta

  private constructor(denom: string, meta: TokenMeta) {
    this.denom = denom
    this.meta = meta
  }

  static fromMeta(denom: string, meta: TokenMeta) {
    return new TokenInfo(denom, meta)
  }

  static fromToken(token: Token) {
    return new TokenInfo(token.denom, token)
  }

  toToken(): Token {
    const { meta, denom } = this

    return {
      ...meta,
      denom,
    }
  }

  /**
   * When we have multiple cw20 entries (versions) of a token
   * on Injective we need to match the denom's address with a
   * cw20 entry and get the symbol for that version
   *
   * ex: (Main) USDC, USDCet, USDCso
   */
  get symbol() {
    const { meta, denom } = this

    if (denom.startsWith('inj') || denom.startsWith('factory/')) {
      const [address] = denom.startsWith('inj')
        ? [denom]
        : denom.split('/').reverse()

      if (!meta.cw20) {
        return meta.symbol
      }

      if (!Array.isArray(meta.cw20)) {
        return meta.symbol
      }

      const actualMeta = meta.cw20.find(
        (m) => m.address.toLowerCase() === address.toLowerCase(),
      )

      return actualMeta ? actualMeta.symbol : meta.symbol
    }

    return meta.symbol
  }

  get logo() {
    const { meta } = this

    return meta.logo
  }

  get coinGeckoId() {
    const { meta } = this

    return meta.coinGeckoId
  }

  get name() {
    const { meta } = this

    return meta.symbol
  }

  get splDecimals() {
    const { meta } = this

    return meta.spl ? meta.spl.decimals : meta.decimals
  }

  /**
   * When we have multiple cw20 entries (versions) of a token
   * on Injective we need to match the denom's address with a
   * cw20 entry and get the decimals for that version
   */
  get cw20Decimals() {
    const { denom, meta } = this

    if (!denom.startsWith('inj') || denom.startsWith('factory/')) {
      return meta.decimals
    }

    const [address] = denom.startsWith('inj')
      ? [denom]
      : denom.split('/').reverse()

    if (!meta.cw20) {
      return meta.decimals
    }

    if (!Array.isArray(meta.cw20)) {
      return meta.cw20.decimals
    }

    const actualMeta = meta.cw20.find(
      (m) => m.address.toLowerCase() === address.toLowerCase(),
    )

    return actualMeta ? actualMeta.decimals : meta.decimals
  }

  get erc20Decimals() {
    const { meta } = this

    return meta.erc20 ? meta.erc20.decimals : meta.decimals
  }

  /**
   * Decimals can vary between different versions of a token
   * so we need to get the decimal places of the token based on the
   * denom (from which we can derive the source of the token)
   */
  get decimals() {
    const { denom, meta } = this

    if (denom.startsWith('inj') || denom.startsWith('factory/')) {
      const [address] = denom.startsWith('inj')
        ? [denom]
        : denom.split('/').reverse()

      if (!meta.cw20) {
        return meta.decimals
      }

      if (!Array.isArray(meta.cw20)) {
        return meta.cw20.decimals
      }

      const actualMeta = meta.cw20.find(
        (m) => m.address.toLowerCase() === address.toLowerCase(),
      )

      return actualMeta ? actualMeta.decimals : meta.decimals
    }

    if (denom.startsWith('peggy')) {
      if (!meta.erc20) {
        return meta.decimals
      }

      return meta.erc20.decimals
    }

    if (denom.startsWith('ibc')) {
      if (!meta.ibc) {
        return meta.decimals
      }

      return meta.ibc.decimals
    }

    return meta.decimals
  }

  get address() {
    const { denom, meta } = this

    if (denom.startsWith('inj') || denom.startsWith('factory/')) {
      const [address] = denom.startsWith('inj')
        ? [denom]
        : denom.split('/').reverse()

      return address
    }

    if (denom.startsWith('peggy')) {
      return meta.erc20 ? meta.erc20.address : ''
    }

    /**
     * Some denoms have ERC20 of their IBC version
     * ex: ATOM
     * */
    if (denom.startsWith('ibc')) {
      return meta.erc20 ? meta.erc20.address : ''
    }

    return ''
  }

  get tokenType(): TokenType {
    const { denom } = this

    if (denom === INJ_DENOM) {
      return TokenType.Native
    }

    if (denom.startsWith('inj')) {
      return TokenType.Cw20
    }

    if (denom.startsWith('factory/')) {
      return TokenType.TokenFactory
    }

    if (denom.startsWith('peggy')) {
      return TokenType.Native
    }

    if (denom.startsWith('share')) {
      return TokenType.InsuranceFund
    }

    return TokenType.Cw20
  }

  get isCanonical() {
    const { denom, meta } = this

    if (!denom.startsWith('ibc/') || !meta.ibc) {
      return false
    }

    const pathParts = meta.ibc.path.replace('transfer/', '').split('/')

    /** More than one channelId */
    if (pathParts.length > 1) {
      return false
    }

    const [channelId] = pathParts

    return canonicalChannelIds.includes(channelId)
  }
}