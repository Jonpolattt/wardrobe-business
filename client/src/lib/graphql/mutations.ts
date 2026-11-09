import { gql } from '@apollo/client';
import { BATCH_FIELDS, PURCHASE_FIELDS, USER_FIELDS } from './fragments';

export const CREATE_PURCHASE = gql`
  mutation CreatePurchase($input: PurchaseInput!) {
    createPurchase(input: $input) {
      ...PurchaseFields
    }
  }
  ${PURCHASE_FIELDS}
`;

export const UPDATE_PURCHASE = gql`
  mutation UpdatePurchase($id: ID!, $input: PurchaseInput!) {
    updatePurchase(id: $id, input: $input) {
      ...PurchaseFields
    }
  }
  ${PURCHASE_FIELDS}
`;

export const DELETE_PURCHASE = gql`
  mutation DeletePurchase($id: ID!, $password: String!) {
    deletePurchase(id: $id, password: $password) {
      id
      archived
    }
  }
`;

export const CREATE_BATCH = gql`
  mutation CreateBatch($input: BatchInput!) {
    createBatch(input: $input) {
      ...BatchFields
    }
  }
  ${BATCH_FIELDS}
`;

export const DELETE_BATCH = gql`
  mutation DeleteBatch($id: ID!, $password: String!) {
    deleteBatch(id: $id, password: $password) {
      id
      archived
    }
  }
`;

export const UPDATE_EXCHANGE_RATES = gql`
  mutation UpdateExchangeRates($input: UpdateExchangeRatesInput!) {
    updateExchangeRates(input: $input) {
      usdToUzs
      usdToCny
      updatedAt
    }
  }
`;

export const RESET_EXCHANGE_RATES = gql`
  mutation ResetExchangeRates {
    resetExchangeRates {
      usdToUzs
      usdToCny
      updatedAt
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const CHANGE_EMAIL = gql`
  mutation ChangeEmail($input: ChangeEmailInput!) {
    changeEmail(input: $input) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      accessToken
      expiresIn
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const REVOKE_SESSION = gql`
  mutation RevokeSession($id: ID!) {
    revokeSession(id: $id)
  }
`;

export const SYNC_STORE = gql`
  mutation SyncStore {
    syncStore {
      id
      status
      ordersSeen
      salesCreated
      salesUpdated
      productsLinked
      error
    }
  }
`;
