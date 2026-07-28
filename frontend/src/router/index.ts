import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/guided',
      name: 'Guided',
      component: () => import('../views/GuidedView.vue'),
      meta: { requiresAuth: true, role: 'GUIDED' },
    },
    {
      path: '/',
      component: () => import('../layouts/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('../views/DashboardView.vue'),
        },
        // Master Data
        {
          path: 'master-data',
          name: 'MasterData',
          component: () => import('../views/master-data/MasterDataIndexView.vue'),
        },
        { path: 'master-data/farmers', name: 'FarmerList', component: () => import('../views/master-data/FarmerListView.vue') },
        { path: 'master-data/employees', name: 'EmployeeList', component: () => import('../views/master-data/EmployeeListView.vue') },
        { path: 'master-data/suppliers', name: 'SupplierList', component: () => import('../views/master-data/SupplierListView.vue') },
        { path: 'master-data/carriers', name: 'CarrierList', component: () => import('../views/master-data/CarrierListView.vue') },
        { path: 'master-data/customers', name: 'CustomerList', component: () => import('../views/master-data/CustomerListView.vue') },
        { path: 'master-data/receiving-items', name: 'ReceivingItemList', component: () => import('../views/master-data/ReceivingItemListView.vue') },
        { path: 'master-data/processing-items', name: 'ProcessingItemList', component: () => import('../views/master-data/ProcessingItemListView.vue') },
        { path: 'master-data/packaging-items', name: 'PackagingItemList', component: () => import('../views/master-data/PackagingItemListView.vue') },
        { path: 'master-data/products', name: 'ProductList', component: () => import('../views/master-data/ProductListView.vue') },
        { path: 'master-data/purchase-items', name: 'PurchaseItemList', component: () => import('../views/master-data/PurchaseItemListView.vue') },
        // Operations
        {
          path: 'operations',
          name: 'Operations',
          component: () => import('../views/operations/OperationsIndexView.vue'),
        },
        {
          path: 'receiving',
          name: 'Receiving',
          component: () => import('../views/operations/receiving/ReceivingListView.vue'),
        },
        {
          path: 'processing',
          name: 'Processing',
          component: () => import('../views/operations/processing/ProcessingListView.vue'),
        },
        {
          path: 'sales',
          name: 'Sales',
          component: () => import('../views/operations/sales/SalesListView.vue'),
        },
        {
          path: 'contract-work',
          name: 'ContractWork',
          component: () => import('../views/operations/contract-work/ContractWorkListView.vue'),
        },
        {
          path: 'inventory',
          name: 'Inventory',
          component: () => import('../views/operations/inventory/InventoryListView.vue'),
        },
        {
          path: 'packaging',
          name: 'Packaging',
          component: () => import('../views/operations/packaging/PackagingListView.vue'),
        },
        {
          path: 'transport',
          name: 'Transport',
          component: () => import('../views/operations/transport/TransportListView.vue'),
        },
        {
          path: 'purchase',
          name: 'Purchase',
          component: () => import('../views/operations/purchase/PurchaseListView.vue'),
        },
        {
          path: 'monitoring',
          name: 'Monitoring',
          component: () => import('../views/operations/monitoring/MonitoringView.vue'),
        },
        {
          path: 'inventory-cost',
          name: 'InventoryCost',
          component: () => import('../views/operations/inventory-cost/InventoryCostView.vue'),
        },
        // 資料查詢
        {
          path: 'queries',
          name: 'Queries',
          component: () => import('../views/inquiry/InquiryIndexView.vue'),
        },
        {
          path: 'queries/receiving',
          name: 'ReceivingInquiry',
          component: () => import('../views/inquiry/receiving/ReceivingInquiryView.vue'),
        },
        {
          path: 'queries/receiving-volume',
          name: 'ReceivingVolumeInquiry',
          component: () => import('../views/inquiry/receiving/ReceivingVolumeInquiryView.vue'),
        },
        {
          path: 'queries/processing-wage',
          name: 'ProcessingWageInquiry',
          component: () => import('../views/inquiry/processing/ProcessingWageInquiryView.vue'),
        },
        {
          path: 'queries/employee-wage-summary',
          name: 'EmployeeWageSummaryInquiry',
          component: () => import('../views/inquiry/employee-wage/EmployeeWageSummaryInquiryView.vue'),
        },
        {
          path: 'queries/farmer-processing',
          name: 'FarmerProcessingInquiry',
          component: () => import('../views/inquiry/processing/FarmerProcessingInquiryView.vue'),
        },
        {
          path: 'queries/h02-processing',
          name: 'H02ProcessingInquiry',
          component: () => import('../views/inquiry/processing/H02ProcessingInquiryView.vue'),
        },
        {
          path: 'queries/h03-processing',
          name: 'H03ProcessingInquiry',
          component: () => import('../views/inquiry/processing/H03ProcessingInquiryView.vue'),
        },
        {
          path: 'queries/packaging',
          name: 'PackagingInquiry',
          component: () => import('../views/inquiry/packaging/PackagingInquiryView.vue'),
        },
        {
          path: 'queries/contract-work',
          name: 'ContractWorkInquiry',
          component: () => import('../views/inquiry/contract-work/ContractWorkInquiryView.vue'),
        },
        {
          path: 'queries/transport',
          name: 'TransportInquiry',
          component: () => import('../views/inquiry/transport/TransportInquiryView.vue'),
        },
        {
          path: 'queries/purchase',
          name: 'PurchaseInquiry',
          component: () => import('../views/inquiry/purchase/PurchaseInquiryView.vue'),
        },
        {
          path: 'queries/sales',
          name: 'SalesInquiry',
          component: () => import('../views/inquiry/sales/SalesInquiryView.vue'),
        },
        {
          path: 'queries/cost-analysis',
          name: 'CostAnalysis',
          component: () => import('../views/inquiry/cost-analysis/CostAnalysisView.vue'),
        },
        {
          path: 'queries/anomalies',
          name: 'Anomalies',
          component: () => import('../views/inquiry/anomalies/AnomaliesView.vue'),
        },
        {
          path: 'users',
          name: 'UserManagement',
          component: () => import('../views/users/UserManagementView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!to.meta.public && !authStore.token) {
    return { name: 'Login' }
  }

  if (authStore.token && !authStore.user) {
    await authStore.fetchMe()
  }

  if (to.name === 'Login' && authStore.token) {
    return authStore.user?.role === 'GUIDED' ? { name: 'Guided' } : { name: 'Dashboard' }
  }

  if (to.meta.role === 'GUIDED' && authStore.user?.role !== 'GUIDED') {
    return { name: 'Dashboard' }
  }

  if (authStore.user?.role === 'GUIDED' && !to.meta.public && to.name !== 'Guided') {
    return { name: 'Guided' }
  }
})

export default router
