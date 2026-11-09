import { gql } from '@apollo/client';
import { BATCH_FIELDS, PURCHASE_FIELDS, USER_FIELDS } from './fragments';

export const INVENTORY_QUERY = gql`
  query Inventory {
    purchases {
      ...PurchaseFields
    }
    batches {
      ...BatchFields
    }
    categories {
      id
      key
      nameRu
      nameUz
    }
  }
  ${PURCHASE_FIELDS}
  ${BATCH_FIELDS}
`;

export const EXCHANGE_RATES_QUERY = gql`
  query ExchangeRates {
    exchangeRates {
      usdToUzs
      usdToCny
      updatedAt
    }
  }
`;

export const DASHBOARD_QUERY = gql`
  query Dashboard($filter: DashboardFilterInput!) {
    dashboard(filter: $filter) {
      selection
      from
      to
      revenueSpark
      salesSpark
      expensesSpark
      profitSpark
      revenueChangePercent
      salesChangePercent
      expensesChangePercent
      profitChangePercent
      current {
        revenue
        salesCount
        expenses
        profit
        expectedProfit
        unallocatedUnits
      }
      previous {
        revenue
        salesCount
        expenses
        profit
      }
    }
  }
`;

export const REVENUE_SERIES_QUERY = gql`
  query RevenueSeries($range: ChartRange!) {
    revenueSeries(range: $range) {
      range
      totalRevenue
      totalExpenses
      revenueChangePercent
      expensesChangePercent
      points {
        date
        revenue
        expenses
      }
    }
  }
`;

export const SALES_BY_CATEGORY_QUERY = gql`
  query SalesByCategory($periodDays: Int!) {
    salesByCategory(periodDays: $periodDays) {
      totalUnits
      categories {
        key
        nameRu
        nameUz
        units
        revenue
        sharePercent
      }
    }
  }
`;

export const EXPENSES_QUERY = gql`
  query Expenses($periodDays: Int) {
    expenses(periodDays: $periodDays) {
      id
      kind
      titleRu
      titleUz
      date
      amountUzs
      purchaseId
    }
  }
`;

export const ACTIVITY_QUERY = gql`
  query Activity($limit: Int!) {
    activity(limit: $limit) {
      id
      type
      title
      actorName
      quantity
      createdAt
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      ...UserFields
    }
    mySessions {
      id
      userAgent
      ip
      createdAt
      lastUsedAt
      current
    }
  }
  ${USER_FIELDS}
`;

export const STORE_SYNC_STATUS_QUERY = gql`
  query StoreSyncStatus {
    storeSyncStatus {
      configured
      lastRun {
        id
        status
        startedAt
        finishedAt
        ordersSeen
        salesCreated
        salesUpdated
        error
      }
    }
  }
`;

export const PRODUCTS_SEARCH_QUERY = gql`
  query ProductsSearch($search: String) {
    products(search: $search, limit: 20) {
      id
      code
      nameRu
      nameUz
      sku
      color
      kind
      photos
      category {
        key
      }
    }
  }
`;
