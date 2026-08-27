import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MarketplaceFeeRulesPage, MarketplaceIntegrationsPage, MarketplaceOverviewPage, MarketplaceSettlementDetailPage, MarketplaceSettlementsPage, MarketplaceSyncHistoryPage, OrderImportPage, ProductMappingsPage, SalesChannelDetailPage, SalesChannelsPage } from './marketplace/MarketplacePages';

export function CraftMarketplace() {
  return <Routes>
    <Route index element={<MarketplaceOverviewPage />} />
    <Route path="channels" element={<SalesChannelsPage />} />
    <Route path="channels/:id" element={<SalesChannelDetailPage />} />
    <Route path="import" element={<OrderImportPage />} />
    <Route path="products" element={<ProductMappingsPage />} />
    <Route path="fees" element={<MarketplaceFeeRulesPage />} />
    <Route path="settlements" element={<MarketplaceSettlementsPage />} />
    <Route path="settlements/:id" element={<MarketplaceSettlementDetailPage />} />
    <Route path="integrations" element={<MarketplaceIntegrationsPage />} />
    <Route path="sync-history" element={<MarketplaceSyncHistoryPage />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>;
}
