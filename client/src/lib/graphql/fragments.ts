import { gql } from '@apollo/client';

export const PRODUCT_FIELDS = gql`
  fragment ProductFields on Product {
    id
    code
    nameRu
    nameUz
    sku
    color
    kind
    photos
    category {
      id
      key
      nameRu
      nameUz
    }
    storeProduct {
      externalId
      sku
      title
      stock
      soldCount
      isActive
      syncedAt
    }
  }
`;

export const PURCHASE_FIELDS = gql`
  fragment PurchaseFields on Purchase {
    id
    currency
    fxRateToUzs
    unitCost
    quantity
    cargoTotal
    pricingMode
    markupPercent
    salePrice
    purchaseTotal
    cargoPerUnit
    unitCostWithCargo
    totalCost
    expectedRevenue
    expectedProfit
    unitCostUzs
    unitCostWithCargoUzs
    cargoTotalUzs
    salePriceUzs
    totalCostUzs
    expectedProfitUzs
    expectedRevenueUzs
    cargoPerUnitUzs
    unitProfitUzs
    remainingProfitUzs
    soldQty
    remainingQty
    revenueUzs
    cogsUzs
    actualProfitUzs
    hasSalesData
    orderDate
    arrivalDate
    archived
    createdAt
    updatedAt
    batch {
      id
      code
      nameRu
      nameUz
      status
    }
    product {
      ...ProductFields
    }
  }
  ${PRODUCT_FIELDS}
`;

export const BATCH_FIELDS = gql`
  fragment BatchFields on Batch {
    id
    code
    nameRu
    nameUz
    originRu
    originUz
    status
    orderDate
    arrivalDate
    date
    plannedUnits
    plannedCost
    plannedCurrency
    lotsCount
    quantity
    totalCostUzs
    expectedRevenueUzs
    expectedProfitUzs
    expectedProfitPercent
    soldQty
    revenueUzs
    cogsUzs
    actualProfitUzs
    netProfitUzs
    netProfitPercent
    archived
    createdAt
  }
`;

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    email
    firstName
    lastName
    phone
    photoUrl
  }
`;
