-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 10, 2026 at 02:39 AM
-- Server version: 8.0.30
-- PHP Version: 8.5.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `uni-nexus`
--

-- --------------------------------------------------------

--
-- Table structure for table `assets`
--

CREATE TABLE `assets` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `asset_code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `category` varchar(100) NOT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `model` varchar(120) DEFAULT NULL,
  `serial_number` varchar(150) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'available' COMMENT 'available|in_use|maintenance|borrowed|retired|lost',
  `purchase_date` date DEFAULT NULL,
  `purchase_cost` decimal(18,2) DEFAULT NULL,
  `current_book_value` decimal(18,2) DEFAULT NULL,
  `depreciation_method` varchar(30) DEFAULT NULL,
  `useful_life_months` int UNSIGNED DEFAULT NULL,
  `location_name` varchar(150) DEFAULT NULL,
  `assigned_user_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_maintenance_records`
--

CREATE TABLE `asset_maintenance_records` (
  `id` bigint UNSIGNED NOT NULL,
  `asset_id` bigint UNSIGNED NOT NULL,
  `maintenance_type` varchar(100) NOT NULL,
  `performed_at` datetime(3) NOT NULL,
  `performed_by_party_id` bigint UNSIGNED DEFAULT NULL,
  `cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `next_due_at` datetime(3) DEFAULT NULL,
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_project_assignments`
--

CREATE TABLE `asset_project_assignments` (
  `id` bigint UNSIGNED NOT NULL,
  `asset_id` bigint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NOT NULL,
  `assigned_from` datetime(3) NOT NULL,
  `assigned_until` datetime(3) DEFAULT NULL,
  `returned_at` datetime(3) DEFAULT NULL,
  `assigned_by` bigint UNSIGNED DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `module_code` varchar(80) NOT NULL,
  `action_code` varchar(80) NOT NULL COMMENT 'create|update|delete|login|logout|status_change|export|approve|etc',
  `entity_type` varchar(80) DEFAULT NULL,
  `entity_id` bigint UNSIGNED DEFAULT NULL,
  `entity_code` varchar(120) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `organization_id`, `business_unit_id`, `user_id`, `module_code`, `action_code`, `entity_type`, `entity_id`, `entity_code`, `description`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-01 22:41:45.540'),
(2, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-02 00:53:01.109'),
(3, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 1, 'FTX-000001', 'SMK9E8F4A manual income', NULL, NULL, NULL, NULL, '2026-09-02 02:34:32.001'),
(4, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 2, 'FTX-000002', 'SMK463E58 manual income', NULL, NULL, NULL, NULL, '2026-09-02 02:35:48.979'),
(5, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 3, 'FTX-000003', 'SMKC0523E manual income', NULL, NULL, NULL, NULL, '2026-09-02 02:37:33.246'),
(6, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 1, 'EXP-000001', 'Membuat pengeluaran EXP-000001.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 02:37:33.281'),
(7, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 1, 'EXP-000001', 'Menyetujui pengeluaran EXP-000001.', NULL, NULL, NULL, NULL, '2026-09-02 02:37:33.293'),
(8, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 1, 'EXP-000001', 'SMKC0523E expense', NULL, NULL, NULL, NULL, '2026-09-02 02:37:33.317'),
(9, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 1, 'EXP-000001', 'Membayar pengeluaran EXP-000001.', NULL, '{\"total\": 100000, \"transaction_id\": 4}', NULL, NULL, '2026-09-02 02:37:33.319'),
(10, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 1, 'EXP-000001', 'Pembalikan EXP-000001: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 02:37:33.343'),
(11, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 1, 'EXP-000001', 'Membalik pengeluaran EXP-000001.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 5}', NULL, NULL, '2026-09-02 02:37:33.347'),
(12, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 6, 'FTX-000006', 'SMKAC8CB7 manual income', NULL, NULL, NULL, NULL, '2026-09-02 02:40:00.382'),
(13, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 2, 'EXP-000002', 'Membuat pengeluaran EXP-000002.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 02:40:00.414'),
(14, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 2, 'EXP-000002', 'Menyetujui pengeluaran EXP-000002.', NULL, NULL, NULL, NULL, '2026-09-02 02:40:00.422'),
(15, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 2, 'EXP-000002', 'SMKAC8CB7 expense', NULL, NULL, NULL, NULL, '2026-09-02 02:40:00.452'),
(16, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 2, 'EXP-000002', 'Membayar pengeluaran EXP-000002.', NULL, '{\"total\": 100000, \"transaction_id\": 7}', NULL, NULL, '2026-09-02 02:40:00.454'),
(17, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 2, 'EXP-000002', 'Pembalikan EXP-000002: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 02:40:00.485'),
(18, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 2, 'EXP-000002', 'Membalik pengeluaran EXP-000002.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 8}', NULL, NULL, '2026-09-02 02:40:00.487'),
(19, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 9, 'FTX-000009', 'SMK88E329 manual income', NULL, NULL, NULL, NULL, '2026-09-02 02:40:26.325'),
(20, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 3, 'EXP-000003', 'Membuat pengeluaran EXP-000003.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 02:40:26.358'),
(21, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 3, 'EXP-000003', 'Menyetujui pengeluaran EXP-000003.', NULL, NULL, NULL, NULL, '2026-09-02 02:40:26.368'),
(22, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 3, 'EXP-000003', 'SMK88E329 expense', NULL, NULL, NULL, NULL, '2026-09-02 02:40:26.398'),
(23, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 3, 'EXP-000003', 'Membayar pengeluaran EXP-000003.', NULL, '{\"total\": 100000, \"transaction_id\": 10}', NULL, NULL, '2026-09-02 02:40:26.401'),
(24, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 3, 'EXP-000003', 'Pembalikan EXP-000003: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 02:40:26.436'),
(25, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 3, 'EXP-000003', 'Membalik pengeluaran EXP-000003.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 11}', NULL, NULL, '2026-09-02 02:40:26.438'),
(26, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 12, 'FTX-000012', 'SMK056E1C manual income', NULL, NULL, NULL, NULL, '2026-09-02 02:41:11.829'),
(27, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 4, 'EXP-000004', 'Membuat pengeluaran EXP-000004.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 02:41:11.857'),
(28, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 4, 'EXP-000004', 'Menyetujui pengeluaran EXP-000004.', NULL, NULL, NULL, NULL, '2026-09-02 02:41:11.865'),
(29, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 4, 'EXP-000004', 'SMK056E1C expense', NULL, NULL, NULL, NULL, '2026-09-02 02:41:11.886'),
(30, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 4, 'EXP-000004', 'Membayar pengeluaran EXP-000004.', NULL, '{\"total\": 100000, \"transaction_id\": 13}', NULL, NULL, '2026-09-02 02:41:11.890'),
(31, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 4, 'EXP-000004', 'Pembalikan EXP-000004: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 02:41:11.921'),
(32, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 4, 'EXP-000004', 'Membalik pengeluaran EXP-000004.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 14}', NULL, NULL, '2026-09-02 02:41:11.925'),
(33, 1, 1, 2, 'craft_finance', 'craft.finance.budget_create', 'budget', 1, 'BDG-000001', 'Membuat anggaran BDG-000001.', NULL, '{\"total\": 300000, \"item_count\": 1}', NULL, NULL, '2026-09-02 02:41:12.002'),
(34, 1, 1, 2, 'craft_finance', 'craft.finance.budget_approve', 'budget', 1, 'BDG-000001', 'Menyetujui anggaran BDG-000001.', NULL, NULL, NULL, NULL, '2026-09-02 02:41:12.009'),
(35, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 15, 'FTX-000015', 'SMK8F616B manual income', NULL, NULL, NULL, NULL, '2026-09-02 02:41:22.691'),
(36, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 5, 'EXP-000005', 'Membuat pengeluaran EXP-000005.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 02:41:22.725'),
(37, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 5, 'EXP-000005', 'Menyetujui pengeluaran EXP-000005.', NULL, NULL, NULL, NULL, '2026-09-02 02:41:22.731'),
(38, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 5, 'EXP-000005', 'SMK8F616B expense', NULL, NULL, NULL, NULL, '2026-09-02 02:41:22.753'),
(39, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 5, 'EXP-000005', 'Membayar pengeluaran EXP-000005.', NULL, '{\"total\": 100000, \"transaction_id\": 16}', NULL, NULL, '2026-09-02 02:41:22.755'),
(40, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 5, 'EXP-000005', 'Pembalikan EXP-000005: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 02:41:22.778'),
(41, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 5, 'EXP-000005', 'Membalik pengeluaran EXP-000005.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 17}', NULL, NULL, '2026-09-02 02:41:22.780'),
(42, 1, 1, 2, 'craft_finance', 'craft.finance.budget_create', 'budget', 2, 'BDG-000002', 'Membuat anggaran BDG-000002.', NULL, '{\"total\": 300000, \"item_count\": 1}', NULL, NULL, '2026-09-02 02:41:22.819'),
(43, 1, 1, 2, 'craft_finance', 'craft.finance.budget_approve', 'budget', 2, 'BDG-000002', 'Menyetujui anggaran BDG-000002.', NULL, NULL, NULL, NULL, '2026-09-02 02:41:22.826'),
(44, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 18, 'FTX-000018', 'SMKC05080 manual income', NULL, NULL, NULL, NULL, '2026-09-02 02:59:41.819'),
(45, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 6, 'EXP-000006', 'Membuat pengeluaran EXP-000006.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 02:59:41.892'),
(46, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 6, 'EXP-000006', 'Menyetujui pengeluaran EXP-000006.', NULL, NULL, NULL, NULL, '2026-09-02 02:59:41.900'),
(47, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 6, 'EXP-000006', 'SMKC05080 expense', NULL, NULL, NULL, NULL, '2026-09-02 02:59:41.931'),
(48, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 6, 'EXP-000006', 'Membayar pengeluaran EXP-000006.', NULL, '{\"total\": 100000, \"transaction_id\": 19}', NULL, NULL, '2026-09-02 02:59:41.934'),
(49, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 6, 'EXP-000006', 'Pembalikan EXP-000006: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 02:59:41.964'),
(50, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 6, 'EXP-000006', 'Membalik pengeluaran EXP-000006.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 20}', NULL, NULL, '2026-09-02 02:59:41.968'),
(51, 1, 1, 2, 'craft_finance', 'craft.finance.budget_create', 'budget', 3, 'BDG-000003', 'Membuat anggaran BDG-000003.', NULL, '{\"total\": 300000, \"item_count\": 1}', NULL, NULL, '2026-09-02 02:59:42.068'),
(52, 1, 1, 2, 'craft_finance', 'craft.finance.budget_approve', 'budget', 3, 'BDG-000003', 'Menyetujui anggaran BDG-000003.', NULL, NULL, NULL, NULL, '2026-09-02 02:59:42.075'),
(53, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 21, 'FTX-000021', 'SMK9667D3 manual income', NULL, NULL, NULL, NULL, '2026-09-02 04:15:57.856'),
(54, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 7, 'EXP-000007', 'Membuat pengeluaran EXP-000007.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 04:15:57.890'),
(55, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 7, 'EXP-000007', 'Menyetujui pengeluaran EXP-000007.', NULL, NULL, NULL, NULL, '2026-09-02 04:15:57.900'),
(56, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 7, 'EXP-000007', 'SMK9667D3 expense', NULL, NULL, NULL, NULL, '2026-09-02 04:15:57.925'),
(57, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 7, 'EXP-000007', 'Membayar pengeluaran EXP-000007.', NULL, '{\"total\": 100000, \"transaction_id\": 22}', NULL, NULL, '2026-09-02 04:15:57.930'),
(58, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 7, 'EXP-000007', 'Pembalikan EXP-000007: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 04:15:57.966'),
(59, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 7, 'EXP-000007', 'Membalik pengeluaran EXP-000007.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 23}', NULL, NULL, '2026-09-02 04:15:57.969'),
(60, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 24, 'FTX-000024', 'SMK14D38A manual income', NULL, NULL, NULL, NULL, '2026-09-02 04:16:18.693'),
(61, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 8, 'EXP-000008', 'Membuat pengeluaran EXP-000008.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 04:16:18.728'),
(62, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 8, 'EXP-000008', 'Menyetujui pengeluaran EXP-000008.', NULL, NULL, NULL, NULL, '2026-09-02 04:16:18.736'),
(63, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 8, 'EXP-000008', 'SMK14D38A expense', NULL, NULL, NULL, NULL, '2026-09-02 04:16:18.765'),
(64, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 8, 'EXP-000008', 'Membayar pengeluaran EXP-000008.', NULL, '{\"total\": 100000, \"transaction_id\": 25}', NULL, NULL, '2026-09-02 04:16:18.779'),
(65, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 8, 'EXP-000008', 'Pembalikan EXP-000008: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 04:16:18.825'),
(66, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 8, 'EXP-000008', 'Membalik pengeluaran EXP-000008.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 26}', NULL, NULL, '2026-09-02 04:16:18.830'),
(67, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 27, 'FTX-000027', 'SMKEAE1BD manual income', NULL, NULL, NULL, NULL, '2026-09-02 04:16:32.813'),
(68, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 9, 'EXP-000009', 'Membuat pengeluaran EXP-000009.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 04:16:32.840'),
(69, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 9, 'EXP-000009', 'Menyetujui pengeluaran EXP-000009.', NULL, NULL, NULL, NULL, '2026-09-02 04:16:32.847'),
(70, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 9, 'EXP-000009', 'SMKEAE1BD expense', NULL, NULL, NULL, NULL, '2026-09-02 04:16:32.869'),
(71, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 9, 'EXP-000009', 'Membayar pengeluaran EXP-000009.', NULL, '{\"total\": 100000, \"transaction_id\": 28}', NULL, NULL, '2026-09-02 04:16:32.872'),
(72, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 9, 'EXP-000009', 'Pembalikan EXP-000009: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 04:16:32.897'),
(73, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 9, 'EXP-000009', 'Membalik pengeluaran EXP-000009.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 29}', NULL, NULL, '2026-09-02 04:16:32.899'),
(74, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 30, 'FTX-000030', 'SMKE65EC0 manual income', NULL, NULL, NULL, NULL, '2026-09-02 04:17:03.909'),
(75, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 10, 'EXP-000010', 'Membuat pengeluaran EXP-000010.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 04:17:03.942'),
(76, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 10, 'EXP-000010', 'Menyetujui pengeluaran EXP-000010.', NULL, NULL, NULL, NULL, '2026-09-02 04:17:03.954'),
(77, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 10, 'EXP-000010', 'SMKE65EC0 expense', NULL, NULL, NULL, NULL, '2026-09-02 04:17:03.980'),
(78, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 10, 'EXP-000010', 'Membayar pengeluaran EXP-000010.', NULL, '{\"total\": 100000, \"transaction_id\": 31}', NULL, NULL, '2026-09-02 04:17:03.985'),
(79, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 10, 'EXP-000010', 'Pembalikan EXP-000010: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 04:17:04.012'),
(80, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 10, 'EXP-000010', 'Membalik pengeluaran EXP-000010.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 32}', NULL, NULL, '2026-09-02 04:17:04.015'),
(81, 1, 1, 2, 'craft_finance', 'craft.finance.budget_create', 'budget', 4, 'BDG-000004', 'Membuat anggaran BDG-000004.', NULL, '{\"total\": 300000, \"item_count\": 1}', NULL, NULL, '2026-09-02 04:17:04.071'),
(82, 1, 1, 2, 'craft_finance', 'craft.finance.budget_approve', 'budget', 4, 'BDG-000004', 'Menyetujui anggaran BDG-000004.', NULL, NULL, NULL, NULL, '2026-09-02 04:17:04.079'),
(83, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 33, 'FTX-000033', 'SMK437A01 manual income', NULL, NULL, NULL, NULL, '2026-09-02 04:21:09.799'),
(84, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 11, 'EXP-000011', 'Membuat pengeluaran EXP-000011.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 04:21:09.825'),
(85, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 11, 'EXP-000011', 'Menyetujui pengeluaran EXP-000011.', NULL, NULL, NULL, NULL, '2026-09-02 04:21:09.832'),
(86, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 11, 'EXP-000011', 'SMK437A01 expense', NULL, NULL, NULL, NULL, '2026-09-02 04:21:09.852'),
(87, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 11, 'EXP-000011', 'Membayar pengeluaran EXP-000011.', NULL, '{\"total\": 100000, \"transaction_id\": 34}', NULL, NULL, '2026-09-02 04:21:09.855'),
(88, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 11, 'EXP-000011', 'Pembalikan EXP-000011: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 04:21:09.877'),
(89, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 11, 'EXP-000011', 'Membalik pengeluaran EXP-000011.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 35}', NULL, NULL, '2026-09-02 04:21:09.879'),
(90, 1, 1, 2, 'craft_finance', 'craft.finance.budget_create', 'budget', 5, 'BDG-000005', 'Membuat anggaran BDG-000005.', NULL, '{\"total\": 300000, \"item_count\": 1}', NULL, NULL, '2026-09-02 04:21:09.925'),
(91, 1, 1, 2, 'craft_finance', 'craft.finance.budget_approve', 'budget', 5, 'BDG-000005', 'Menyetujui anggaran BDG-000005.', NULL, NULL, NULL, NULL, '2026-09-02 04:21:09.932'),
(92, 1, 1, 2, 'craft_finance', 'craft.finance.manual_income', 'financial_transaction', 36, 'FTX-000036', 'SMKDC92FC manual income', NULL, NULL, NULL, NULL, '2026-09-02 04:25:15.004'),
(93, 1, 1, 2, 'craft_finance', 'craft.finance.expense_create', 'expense', 12, 'EXP-000012', 'Membuat pengeluaran EXP-000012.', NULL, '{\"amount\": 100000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-02 04:25:15.030'),
(94, 1, 1, 2, 'craft_finance', 'craft.finance.expense_approve', 'expense', 12, 'EXP-000012', 'Menyetujui pengeluaran EXP-000012.', NULL, NULL, NULL, NULL, '2026-09-02 04:25:15.042'),
(95, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 12, 'EXP-000012', 'SMKDC92FC expense', NULL, NULL, NULL, NULL, '2026-09-02 04:25:15.064'),
(96, 1, 1, 2, 'craft_finance', 'craft.finance.expense_pay', 'expense', 12, 'EXP-000012', 'Membayar pengeluaran EXP-000012.', NULL, '{\"total\": 100000, \"transaction_id\": 37}', NULL, NULL, '2026-09-02 04:25:15.067'),
(97, 1, 1, 2, 'craft_finance', 'craft.finance.expense_reversal', 'expense', 12, 'EXP-000012', 'Pembalikan EXP-000012: Smoke test reversal', NULL, NULL, NULL, NULL, '2026-09-02 04:25:15.093'),
(98, 1, 1, 2, 'craft_finance', 'craft.finance.expense_void', 'expense', 12, 'EXP-000012', 'Membalik pengeluaran EXP-000012.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Smoke test reversal\", \"status_code\": \"void\", \"reversal_transaction_id\": 38}', NULL, NULL, '2026-09-02 04:25:15.096'),
(99, 1, 1, 2, 'craft_finance', 'craft.finance.budget_create', 'budget', 6, 'BDG-000006', 'Membuat anggaran BDG-000006.', NULL, '{\"total\": 300000, \"item_count\": 1}', NULL, NULL, '2026-09-02 04:25:15.151'),
(100, 1, 1, 2, 'craft_finance', 'craft.finance.budget_approve', 'budget', 6, 'BDG-000006', 'Menyetujui anggaran BDG-000006.', NULL, NULL, NULL, NULL, '2026-09-02 04:25:15.160'),
(101, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:14:04.807'),
(102, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:18:14.966'),
(103, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:29:34.773'),
(104, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:29:40.220'),
(105, 1, NULL, 394, 'users', 'signup_request', 'user', 394, 'qa1', 'User signup request', NULL, NULL, NULL, NULL, '2026-09-09 01:42:55.406'),
(106, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:48:01.975'),
(107, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:48:06.131'),
(108, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:48:08.723'),
(109, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:48:28.973'),
(110, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:48:33.403'),
(111, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:48:53.648'),
(112, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:50:28.915'),
(113, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:52:09.602'),
(114, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:52:58.782'),
(115, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:53:49.703'),
(116, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:53:52.876'),
(117, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:55:53.813'),
(118, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:56:15.455'),
(119, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:56:24.730'),
(120, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:56:27.200'),
(121, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:56:33.061'),
(122, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:56:51.534'),
(123, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:58:30.339'),
(124, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:59:07.005'),
(125, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 01:59:10.196'),
(126, 1, NULL, 3, 'auth', 'login', 'user', 3, 'apriladzania', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:02:28.569'),
(127, 1, NULL, 3, 'auth', 'logout', 'user', 3, 'apriladzania', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:02:40.720'),
(128, 1, NULL, 4, 'auth', 'login', 'user', 4, 'diandaeli', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:02:49.838'),
(129, 1, NULL, 4, 'auth', 'logout', 'user', 4, 'diandaeli', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:03:06.088'),
(130, 1, NULL, 4, 'auth', 'login', 'user', 4, 'diandaeli', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:03:10.927'),
(131, 1, NULL, 4, 'auth', 'logout', 'user', 4, 'diandaeli', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:03:19.829'),
(132, 1, NULL, 9, 'auth', 'login', 'user', 9, 'ahmadropaldo', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:03:25.368'),
(133, 1, NULL, 9, 'auth', 'logout', 'user', 9, 'ahmadropaldo', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:04:08.061'),
(134, 1, NULL, 3, 'auth', 'login', 'user', 3, 'apriladzania', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:04:13.837'),
(135, 1, NULL, 3, 'auth', 'logout', 'user', 3, 'apriladzania', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:04:22.532'),
(136, 1, NULL, 9, 'auth', 'login', 'user', 9, 'ahmadropaldo', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:04:26.049'),
(137, 1, NULL, 9, 'auth', 'logout', 'user', 9, 'ahmadropaldo', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:05:02.031'),
(138, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:05:07.748'),
(139, 1, NULL, 2, 'users', 'approval', 'user', 394, 'qa1', 'Menyetujui akun QA User 1.', '{\"status_code\": \"inactive\", \"approval_status_code\": \"pending\"}', '{\"role_code\": \"ENGINEER_3D\", \"status_code\": \"active\", \"approval_status_code\": \"approved\"}', NULL, NULL, '2026-09-09 02:10:58.479'),
(140, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:11:12.417'),
(141, 1, NULL, 394, 'auth', 'login', 'user', 394, 'qa1', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:11:17.277'),
(142, 1, NULL, 394, 'auth', 'login', 'user', 394, 'qa1', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:17:02.153'),
(143, 1, NULL, 394, 'auth', 'logout', 'user', 394, 'qa1', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:50:53.416'),
(144, 1, NULL, 395, 'users', 'signup_request', 'user', 395, 'qa2', 'User signup request', NULL, NULL, NULL, NULL, '2026-09-09 02:52:41.129'),
(145, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:54:05.628'),
(146, 1, NULL, 2, 'users', 'rejection', 'user', 395, 'qa2', 'Menolak akun QA User 2.', '{\"status_code\": \"inactive\", \"approval_status_code\": \"pending\"}', '{\"status_code\": \"inactive\", \"approval_status_code\": \"rejected\"}', NULL, NULL, '2026-09-09 02:59:44.936'),
(147, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 02:59:58.372'),
(148, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 03:05:55.511'),
(149, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 03:47:48.093'),
(150, 1, NULL, 394, 'auth', 'login', 'user', 394, 'qa1', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 03:47:53.021'),
(151, 1, NULL, 394, 'auth', 'login', 'user', 394, 'qa1', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 03:58:53.189'),
(152, 1, NULL, 394, 'auth', 'logout', 'user', 394, 'qa1', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 03:59:09.447'),
(153, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 03:59:14.873'),
(154, 1, NULL, 2, 'users', 'profile.status_change', 'user', 2, 'taqizdihar', 'Profile status updated', '{\"profile_status_code\": \"default\"}', '{\"profile_status_code\": \"busy\"}', NULL, NULL, '2026-09-09 04:28:05.340'),
(155, 1, NULL, 2, 'users', 'profile.status_change', 'user', 2, 'taqizdihar', 'Profile status updated', '{\"profile_status_code\": \"busy\"}', '{\"profile_status_code\": \"default\"}', NULL, NULL, '2026-09-09 04:28:07.177'),
(156, 1, NULL, 394, 'users', 'profile.update', 'user', 394, 'qauser1', 'Profile updated', '{\"email\": \"qa1@gmail.com\", \"phone\": null, \"username\": \"qa1\", \"full_name\": \"QA User 1\", \"default_workspace_code\": \"craft\"}', '{\"email\": \"qa1@gmail.com\", \"phone\": \"081316556900\", \"username\": \"qauser1\", \"full_name\": \"QA User-1\", \"default_workspace_code\": \"studio\"}', NULL, NULL, '2026-09-09 06:18:51.657'),
(157, 1, NULL, 394, 'auth', 'logout', 'user', 394, 'qauser1', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 06:19:19.828'),
(158, 1, NULL, 394, 'auth', 'login', 'user', 394, 'qauser1', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-09 06:19:37.403'),
(159, 1, NULL, 2, 'users', 'profile.status_change', 'user', 2, 'taqizdihar', 'Profile status updated', '{\"profile_status_code\": \"default\"}', '{\"profile_status_code\": \"busy\"}', NULL, NULL, '2026-09-09 06:20:12.202'),
(160, 1, NULL, 2, 'users', 'profile.status_change', 'user', 2, 'taqizdihar', 'Profile status updated', '{\"profile_status_code\": \"busy\"}', '{\"profile_status_code\": \"sick\"}', NULL, NULL, '2026-09-09 06:20:14.912'),
(161, 1, NULL, 2, 'users', 'profile.status_change', 'user', 2, 'taqizdihar', 'Profile status updated', '{\"profile_status_code\": \"sick\"}', '{\"profile_status_code\": \"leave\"}', NULL, NULL, '2026-09-09 06:20:16.775'),
(162, 1, NULL, 2, 'users', 'profile.banner_update', 'user', 2, NULL, 'Profile media updated', '{\"has_media\": true}', '{\"has_media\": true}', NULL, NULL, '2026-09-09 06:20:53.892'),
(163, 1, NULL, 2, 'users', 'profile.status_change', 'user', 2, 'taqizdihar', 'Profile status updated', '{\"profile_status_code\": \"leave\"}', '{\"profile_status_code\": \"default\"}', NULL, NULL, '2026-09-09 06:24:43.300'),
(164, 1, NULL, 2, 'users', 'profile.avatar_delete', 'user', 2, NULL, 'Profile media deleted', '{\"has_media\": true}', '{\"has_media\": false}', NULL, NULL, '2026-09-09 06:25:30.910'),
(165, 1, NULL, 2, 'users', 'profile.avatar_update', 'user', 2, NULL, 'Profile media updated', '{\"has_media\": false}', '{\"has_media\": true}', NULL, NULL, '2026-09-09 06:25:53.804'),
(166, 1, NULL, 2, 'users', 'profile.password_change', 'user', 2, NULL, 'Password changed', NULL, '{\"password_changed\": \"[REDACTED]\"}', NULL, NULL, '2026-09-09 07:23:58.831'),
(167, 1, NULL, 2, 'users', 'profile.update', 'user', 2, 'taqizdihar', 'Profile updated', '{\"email\": \"m.taqizdihar@gmail.com\", \"phone\": null, \"username\": \"taqizdihar\", \"full_name\": \"Muhammad Taqi Izdihar\", \"default_workspace_code\": \"craft\"}', '{\"email\": \"m.taqizdihar@gmail.com\", \"phone\": null, \"username\": \"taqizdihar\", \"full_name\": \"Muhammad Taqi Izdiharr\", \"default_workspace_code\": \"craft\"}', NULL, NULL, '2026-09-09 07:24:15.060'),
(168, 1, NULL, 394, 'users', 'account.deletion_request', 'user_deletion_request', 1, NULL, 'Account deletion requested', NULL, NULL, NULL, NULL, '2026-09-09 07:27:12.510'),
(169, 1, NULL, 394, 'users', 'account.deletion_request_revoke', 'user_deletion_request', 1, NULL, 'Account deletion request revoked', NULL, NULL, NULL, NULL, '2026-09-09 07:27:19.094'),
(170, 1, NULL, 394, 'users', 'account.deletion_request', 'user_deletion_request', 2, NULL, 'Account deletion requested', NULL, NULL, NULL, NULL, '2026-09-09 07:27:43.476'),
(171, 1, NULL, 394, 'users', 'account.deletion_request_revoke', 'user_deletion_request', 2, NULL, 'Account deletion request revoked', NULL, NULL, NULL, NULL, '2026-09-09 07:28:34.251'),
(172, 1, NULL, 2, 'users', 'account_delete', 'user', 395, NULL, 'Account archived by management', NULL, NULL, NULL, NULL, '2026-09-09 07:28:57.326'),
(173, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:09:44.395'),
(174, 1, NULL, 2, 'settings', 'settings.organization.update', 'organization', 1, 'UNI-INSIDE', 'Memperbarui profil organisasi.', '{\"city\": null, \"name\": \"Uni-Inside Studio\", \"email\": null, \"phone\": null, \"address\": null, \"province\": null, \"timezone\": \"Asia/Jakarta\", \"legal_name\": \"Uni-Inside Studio\", \"postal_code\": null, \"country_code\": \"ID\", \"currency_code\": \"IDR\"}', '{\"city\": \"\", \"name\": \"Uni-Inside Studio\", \"email\": \"uninsidemed@gmail.com\", \"phone\": \"\", \"address\": \"\", \"province\": \"\", \"timezone\": \"Asia/Jakarta\", \"legal_name\": \"Uni-Inside Studio\", \"postal_code\": \"\", \"country_code\": \"ID\", \"currency_code\": \"IDR\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:12:32.836'),
(175, 1, NULL, 2, 'settings', 'settings.organization.update', 'organization', 1, 'UNI-INSIDE', 'Memperbarui profil organisasi.', '{\"city\": \"\", \"name\": \"Uni-Inside Studio\", \"email\": \"uninsidemed@gmail.com\", \"phone\": \"\", \"address\": \"\", \"province\": \"\", \"timezone\": \"Asia/Jakarta\", \"legal_name\": \"Uni-Inside Studio\", \"postal_code\": \"\", \"country_code\": \"ID\", \"currency_code\": \"IDR\"}', '{\"city\": \"\", \"name\": \"Uni-Inside Studio\", \"email\": \"uninsidemed@gmail.com\", \"phone\": \"\", \"address\": \"\", \"province\": \"\", \"timezone\": \"Asia/Jakarta\", \"legal_name\": \"Uni-Inside Studio\", \"postal_code\": \"\", \"country_code\": \"ID\", \"currency_code\": \"USD\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:16:27.865'),
(176, 1, NULL, 2, 'settings', 'settings.organization.update', 'organization', 1, 'UNI-INSIDE', 'Memperbarui profil organisasi.', '{\"city\": \"\", \"name\": \"Uni-Inside Studio\", \"email\": \"uninsidemed@gmail.com\", \"phone\": \"\", \"address\": \"\", \"province\": \"\", \"timezone\": \"Asia/Jakarta\", \"legal_name\": \"Uni-Inside Studio\", \"postal_code\": \"\", \"country_code\": \"ID\", \"currency_code\": \"USD\"}', '{\"city\": \"\", \"name\": \"Uni-Inside Studio\", \"email\": \"uninsidemed@gmail.com\", \"phone\": \"\", \"address\": \"\", \"province\": \"\", \"timezone\": \"Asia/Jakarta\", \"legal_name\": \"Uni-Inside Studio\", \"postal_code\": \"\", \"country_code\": \"ID\", \"currency_code\": \"IDR\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:16:34.801'),
(177, 1, NULL, 2, 'settings', 'settings.organization.logo.upload', 'organization', 1, 'UNI-INSIDE', 'Mengganti logo organisasi.', '{\"logo_configured\": true}', '{\"logo_configured\": true}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:28:08.244'),
(178, 1, NULL, 2, 'settings', 'settings.organization.update', 'organization', 1, 'UNI-INSIDE', 'Memperbarui profil organisasi.', '{\"city\": \"\", \"name\": \"Uni-Inside Studio\", \"email\": \"uninsidemed@gmail.com\", \"phone\": \"\", \"address\": \"\", \"province\": \"\", \"timezone\": \"Asia/Jakarta\", \"legal_name\": \"Uni-Inside Studio\", \"postal_code\": \"\", \"country_code\": \"ID\", \"currency_code\": \"IDR\"}', '{\"city\": \"Kabupaten Bandung\", \"name\": \"Uni-Inside Studio\", \"email\": \"uninsidemed@gmail.com\", \"phone\": \"6281316556908\", \"address\": \"Jl. Telekomunikasi No. 1, Sukapura, Kec. Dayeuhkolot.\", \"province\": \"Jawa Barat\", \"timezone\": \"Asia/Jakarta\", \"legal_name\": \"Uni-Inside Studio\", \"postal_code\": \"40257\", \"country_code\": \"ID\", \"currency_code\": \"IDR\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:30:07.907'),
(179, 1, NULL, 2, 'settings', 'settings.group.update', 'system_setting_group', NULL, 'organization:general', 'Memperbarui grup pengaturan general.', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"monday\"}]}', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"sunday\"}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:30:14.107'),
(180, 1, NULL, 2, 'settings', 'settings.group.update', 'system_setting_group', NULL, 'organization:general', 'Memperbarui grup pengaturan general.', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"sunday\"}]}', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"monday\"}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:30:16.608'),
(181, 1, NULL, 2, 'settings', 'settings.group.update', 'system_setting_group', NULL, 'organization:documents', 'Memperbarui grup pengaturan documents.', '{\"group\": \"documents\", \"scope\": \"organization\", \"settings\": [{\"key\": \"pdf_footer_text\", \"value\": null}, {\"key\": \"show_organization_contact\", \"value\": true}, {\"key\": \"show_organization_logo\", \"value\": true}]}', '{\"group\": \"documents\", \"scope\": \"organization\", \"settings\": [{\"key\": \"pdf_footer_text\", \"value\": \"Uni-Inside Studio, all rights reserved\"}, {\"key\": \"show_organization_contact\", \"value\": true}, {\"key\": \"show_organization_logo\", \"value\": true}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:31:46.701'),
(182, 1, 1, 2, 'settings', 'settings.group.update', 'system_setting_group', NULL, 'craft:notifications', 'Memperbarui grup pengaturan notifications.', '{\"group\": \"notifications\", \"scope\": \"craft\", \"settings\": [{\"key\": \"order_deadline_warning_hours\", \"value\": 24}]}', '{\"group\": \"notifications\", \"scope\": \"craft\", \"settings\": [{\"key\": \"order_deadline_warning_hours\", \"value\": 21}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-10 01:31:52.089');

-- --------------------------------------------------------

--
-- Table structure for table `automation_rules`
--

CREATE TABLE `automation_rules` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `rule_code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `module_code` varchar(60) NOT NULL,
  `trigger_type` varchar(30) NOT NULL DEFAULT 'event' COMMENT 'event|schedule|sensor|manual',
  `trigger_event` varchar(100) NOT NULL,
  `trigger_config_json` json DEFAULT NULL,
  `schedule_timezone` varchar(64) DEFAULT NULL,
  `condition_json` json DEFAULT NULL,
  `action_json` json NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'active' COMMENT 'draft|active|paused|disabled',
  `priority` int NOT NULL DEFAULT '100',
  `cooldown_seconds` int UNSIGNED NOT NULL DEFAULT '0',
  `max_retries` smallint UNSIGNED NOT NULL DEFAULT '0',
  `next_run_at` datetime(3) DEFAULT NULL,
  `last_run_at` datetime(3) DEFAULT NULL,
  `last_success_at` datetime(3) DEFAULT NULL,
  `last_failure_at` datetime(3) DEFAULT NULL,
  `version_no` int UNSIGNED NOT NULL DEFAULT '1',
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `automation_runs`
--

CREATE TABLE `automation_runs` (
  `id` bigint UNSIGNED NOT NULL,
  `rule_id` bigint UNSIGNED NOT NULL,
  `run_key` varchar(190) DEFAULT NULL,
  `rule_version` int UNSIGNED NOT NULL DEFAULT '1',
  `trigger_event` varchar(100) DEFAULT NULL,
  `trigger_entity_type` varchar(60) DEFAULT NULL,
  `trigger_entity_id` bigint UNSIGNED DEFAULT NULL,
  `scheduled_for` datetime(3) DEFAULT NULL,
  `initiated_by` bigint UNSIGNED DEFAULT NULL,
  `attempt_no` smallint UNSIGNED NOT NULL DEFAULT '1',
  `next_attempt_at` datetime(3) DEFAULT NULL,
  `correlation_id` varchar(64) DEFAULT NULL,
  `chain_depth` smallint UNSIGNED NOT NULL DEFAULT '0',
  `status_code` varchar(30) NOT NULL COMMENT 'queued|running|success|failed|skipped',
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finished_at` datetime(3) DEFAULT NULL,
  `input_json` json DEFAULT NULL,
  `rule_snapshot_json` json DEFAULT NULL,
  `result_json` json DEFAULT NULL,
  `error_message` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `budgets`
--

CREATE TABLE `budgets` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `budget_code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'draft' COMMENT 'draft|approved|active|closed',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `budget_items`
--

CREATE TABLE `budget_items` (
  `id` bigint UNSIGNED NOT NULL,
  `budget_id` bigint UNSIGNED NOT NULL,
  `category_id` bigint UNSIGNED DEFAULT NULL,
  `name` varchar(180) NOT NULL,
  `allocated_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `business_units`
--

CREATE TABLE `business_units` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `unit_type` varchar(30) NOT NULL COMMENT 'craft|studio|shared',
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `business_units`
--

INSERT INTO `business_units` (`id`, `organization_id`, `code`, `name`, `unit_type`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'CRAFT', 'Uni-Inside Craft', 'craft', 'Operasional produksi 3D printing dan penjualan produk Craft.', 1, '2026-08-22 07:48:09.698', '2026-08-22 07:48:09.698'),
(2, 1, 'STUDIO', 'Uni-Inside Studio', 'studio', 'Operasional layanan kreatif dan proyek Studio.', 1, '2026-08-22 07:48:09.704', '2026-08-22 07:48:09.704'),
(3, 1, 'SHARED', 'Uni-Inside Shared', 'shared', 'Data dan transaksi bersama lintas unit bisnis.', 1, '2026-08-22 07:48:09.706', '2026-08-22 07:48:09.706');

-- --------------------------------------------------------

--
-- Table structure for table `calendar_events`
--

CREATE TABLE `calendar_events` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `event_code` varchar(80) NOT NULL,
  `title` varchar(220) NOT NULL,
  `description` text,
  `location_name` varchar(220) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL COMMENT 'order_deadline|production|project_deadline|maintenance|payment|meeting|task|other',
  `source_module_code` varchar(80) DEFAULT NULL COMMENT 'Canonical module that owns or produced this event',
  `start_at` datetime(3) NOT NULL,
  `end_at` datetime(3) DEFAULT NULL,
  `all_day` tinyint(1) NOT NULL DEFAULT '0',
  `status_code` varchar(30) NOT NULL DEFAULT 'scheduled' COMMENT 'scheduled|completed|cancelled',
  `reminder_minutes_before` int UNSIGNED DEFAULT NULL,
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint UNSIGNED DEFAULT NULL,
  `source_code` varchar(120) DEFAULT NULL,
  `source_key` varchar(190) DEFAULT NULL COMMENT 'Deterministic idempotency key for source-owned events',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `calendar_event_attendees`
--

CREATE TABLE `calendar_event_attendees` (
  `event_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `response_status_code` varchar(20) NOT NULL DEFAULT 'invited' COMMENT 'invited|accepted|tentative|declined',
  `added_by` bigint UNSIGNED DEFAULT NULL,
  `responded_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `channel_product_mappings`
--

CREATE TABLE `channel_product_mappings` (
  `id` bigint UNSIGNED NOT NULL,
  `sales_channel_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `variant_id` bigint UNSIGNED DEFAULT NULL,
  `external_product_id` varchar(190) DEFAULT NULL,
  `external_sku` varchar(190) DEFAULT NULL,
  `external_url` varchar(500) DEFAULT NULL,
  `sync_status_code` varchar(30) NOT NULL DEFAULT 'manual',
  `last_synced_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chart_of_accounts`
--

CREATE TABLE `chart_of_accounts` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `account_code` varchar(30) NOT NULL,
  `account_name` varchar(180) NOT NULL,
  `account_type` varchar(30) NOT NULL COMMENT 'asset|liability|equity|revenue|expense',
  `normal_balance` varchar(10) NOT NULL COMMENT 'debit|credit',
  `parent_account_id` bigint UNSIGNED DEFAULT NULL,
  `is_control_account` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `chart_of_accounts`
--

INSERT INTO `chart_of_accounts` (`id`, `organization_id`, `business_unit_id`, `account_code`, `account_name`, `account_type`, `normal_balance`, `parent_account_id`, `is_control_account`, `is_active`, `created_at`) VALUES
(7, 1, NULL, 'SMKC0523E-CASH', 'SMKC0523E Kas', 'asset', 'debit', NULL, 0, 1, '2026-09-02 09:37:33.200'),
(9, 1, NULL, 'SMKC0523E-EXP', 'SMKC0523E Beban', 'expense', 'debit', NULL, 0, 1, '2026-09-02 09:37:33.207');

-- --------------------------------------------------------

--
-- Table structure for table `craft_orders`
--

CREATE TABLE `craft_orders` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `order_code` varchar(80) NOT NULL,
  `customer_party_id` bigint UNSIGNED NOT NULL,
  `sales_channel_id` bigint UNSIGNED NOT NULL,
  `external_order_id` varchar(190) DEFAULT NULL,
  `order_type` varchar(30) NOT NULL DEFAULT 'standard' COMMENT 'standard|custom|partner|internal',
  `order_date` datetime(3) NOT NULL,
  `deadline_at` datetime(3) DEFAULT NULL,
  `priority_code` varchar(20) NOT NULL DEFAULT 'normal' COMMENT 'low|normal|high|critical',
  `priority_score` decimal(10,3) NOT NULL DEFAULT '0.000',
  `priority_reason` varchar(500) DEFAULT NULL,
  `is_priority_manual` tinyint(1) NOT NULL DEFAULT '0',
  `status_code` varchar(30) NOT NULL DEFAULT 'new' COMMENT 'new|confirmed|waiting|ready|in_production|qc|completed|packed|shipped|cancelled|returned',
  `payment_status_code` varchar(30) NOT NULL DEFAULT 'unpaid' COMMENT 'unpaid|partial|paid|refunded|cancelled',
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `shipping_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `marketplace_fee_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `customer_notes` text,
  `internal_notes` text,
  `shipping_recipient_name` varchar(180) DEFAULT NULL,
  `shipping_phone` varchar(50) DEFAULT NULL,
  `shipping_address` text,
  `courier_name` varchar(100) DEFAULT NULL,
  `tracking_number` varchar(190) DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `completed_at` datetime(3) DEFAULT NULL,
  `cancelled_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `craft_order_drafts`
--

CREATE TABLE `craft_order_drafts` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `draft_code` varchar(80) DEFAULT NULL,
  `title` varchar(180) DEFAULT NULL,
  `payload_json` json NOT NULL,
  `schema_version` int UNSIGNED NOT NULL DEFAULT '1',
  `status_code` varchar(30) NOT NULL DEFAULT 'active' COMMENT 'active|converted|discarded',
  `converted_order_id` bigint UNSIGNED DEFAULT NULL,
  `created_by` bigint UNSIGNED NOT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `converted_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `craft_order_items`
--

CREATE TABLE `craft_order_items` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `variant_id` bigint UNSIGNED DEFAULT NULL,
  `item_name` varchar(200) NOT NULL,
  `item_description` text,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `unit_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `estimated_material_g` decimal(12,3) DEFAULT NULL,
  `estimated_print_minutes` int UNSIGNED DEFAULT NULL,
  `print_profile_id` bigint UNSIGNED DEFAULT NULL,
  `custom_spec_json` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `craft_order_status_history`
--

CREATE TABLE `craft_order_status_history` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `from_status_code` varchar(30) DEFAULT NULL,
  `to_status_code` varchar(30) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `changed_by` bigint UNSIGNED DEFAULT NULL,
  `changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `design_files`
--

CREATE TABLE `design_files` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `variant_id` bigint UNSIGNED DEFAULT NULL,
  `design_code` varchar(80) NOT NULL,
  `name` varchar(200) NOT NULL,
  `file_type` varchar(20) NOT NULL COMMENT 'stl|3mf|step|scad|obj|blend|other',
  `file_name` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `version_label` varchar(50) DEFAULT NULL,
  `file_size_bytes` bigint UNSIGNED DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `is_final` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_by` bigint UNSIGNED DEFAULT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `document_code` varchar(80) DEFAULT NULL,
  `document_type` varchar(60) NOT NULL COMMENT 'invoice|quotation|receipt|report|purchase_order|contract|design|other',
  `source_module_code` varchar(80) DEFAULT NULL COMMENT 'Canonical module that owns or produced the document',
  `title` varchar(220) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `file_size_bytes` bigint UNSIGNED DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `entity_type` varchar(60) DEFAULT NULL,
  `entity_id` bigint UNSIGNED DEFAULT NULL,
  `entity_code` varchar(120) DEFAULT NULL,
  `version_no` int UNSIGNED NOT NULL DEFAULT '1',
  `is_template` tinyint(1) NOT NULL DEFAULT '0',
  `archived_at` datetime(3) DEFAULT NULL,
  `archived_by` bigint UNSIGNED DEFAULT NULL,
  `uploaded_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document_templates`
--

CREATE TABLE `document_templates` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `template_code` varchar(80) NOT NULL,
  `template_type` varchar(60) NOT NULL COMMENT 'invoice|quotation|receipt|report|purchase_order|other',
  `name` varchar(180) NOT NULL,
  `html_template` longtext,
  `config_json` json DEFAULT NULL,
  `header_logo_path` varchar(500) DEFAULT NULL,
  `footer_text` text,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `domain_events`
--

CREATE TABLE `domain_events` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `event_key` varchar(190) NOT NULL,
  `event_name` varchar(100) NOT NULL,
  `module_code` varchar(60) NOT NULL,
  `entity_type` varchar(60) DEFAULT NULL,
  `entity_id` bigint UNSIGNED DEFAULT NULL,
  `entity_code` varchar(120) DEFAULT NULL,
  `actor_user_id` bigint UNSIGNED DEFAULT NULL,
  `correlation_id` varchar(64) DEFAULT NULL,
  `causation_event_id` bigint UNSIGNED DEFAULT NULL,
  `source_automation_run_id` bigint UNSIGNED DEFAULT NULL,
  `chain_depth` smallint UNSIGNED NOT NULL DEFAULT '0',
  `payload_json` json DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|processing|processed|failed',
  `available_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `locked_at` datetime(3) DEFAULT NULL,
  `locked_by` varchar(120) DEFAULT NULL,
  `attempt_count` smallint UNSIGNED NOT NULL DEFAULT '0',
  `processed_at` datetime(3) DEFAULT NULL,
  `last_error` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `domain_events`
--

INSERT INTO `domain_events` (`id`, `organization_id`, `business_unit_id`, `event_key`, `event_name`, `module_code`, `entity_type`, `entity_id`, `entity_code`, `actor_user_id`, `correlation_id`, `causation_event_id`, `source_automation_run_id`, `chain_depth`, `payload_json`, `status_code`, `available_at`, `locked_at`, `locked_by`, `attempt_count`, `processed_at`, `last_error`, `created_at`) VALUES
(2, 1, 1, 'e0e7cc9c-7515-49a3-8472-b4b1aa8a542a', 'craft.finance.manual_income_posted', 'craft_finance', 'financial_transaction', 21, 'FTX-000021', 2, '787fce80-d2dd-44ab-b701-974223d265e2', NULL, NULL, 0, '{\"context\": {\"amount\": 250000, \"reference_number\": null}}', 'processed', '2026-09-02 04:15:57.859', NULL, NULL, 0, '2026-09-02 04:15:58.741', NULL, '2026-09-02 11:15:57.859'),
(3, 1, 1, '927fc00c-bd74-4e33-a711-05680251d0f4', 'craft.finance.expense_created', 'craft_finance', 'expense', 7, 'EXP-000007', 2, '23b6709a-e328-4b85-b0b7-9b9f3514907f', NULL, NULL, 0, '{\"context\": {\"amount\": 100000, \"status_code\": \"draft\"}}', 'processed', '2026-09-02 04:15:57.892', NULL, NULL, 0, '2026-09-02 04:15:58.745', NULL, '2026-09-02 11:15:57.892'),
(4, 1, 1, '7338f051-0161-4d3a-993b-db8e6aeb2e6f', 'craft.finance.expense_approved', 'craft_finance', 'expense', 7, 'EXP-000007', 2, '992af3e3-1880-402a-81fe-defeb7447b67', NULL, NULL, 0, '{\"context\": {}}', 'processed', '2026-09-02 04:15:57.901', NULL, NULL, 0, '2026-09-02 04:15:58.749', NULL, '2026-09-02 11:15:57.901'),
(5, 1, 1, 'a2898955-8692-40e8-a383-c98f9ef7d757', 'craft.finance.expense_paid', 'craft_finance', 'expense', 7, 'EXP-000007', 2, 'f6cb3024-2a9e-41bd-bba0-beb98e1e1432', NULL, NULL, 0, '{\"context\": {\"direct_payment\": false, \"transaction_id\": 22}}', 'processed', '2026-09-02 04:15:57.931', NULL, NULL, 0, '2026-09-02 04:15:58.751', NULL, '2026-09-02 11:15:57.931'),
(6, 1, 1, '23575c69-11e8-47e0-8ebf-755789540a7a', 'craft.finance.expense_reversed', 'craft_finance', 'expense', 7, 'EXP-000007', 2, '3f760fa3-056b-4c07-9ca8-d76462e8b9a2', NULL, NULL, 0, '{\"context\": {\"reason\": \"Smoke test reversal\", \"reversal_transaction_id\": 23}}', 'processed', '2026-09-02 04:15:57.970', NULL, NULL, 0, '2026-09-02 04:15:58.754', NULL, '2026-09-02 11:15:57.970'),
(7, 1, 1, '88dc720f-e3ea-412e-9be5-18339f2f2403', 'craft.finance.manual_income_posted', 'craft_finance', 'financial_transaction', 24, 'FTX-000024', 2, '61012a9a-a161-4d85-b07b-8ee474692ea8', NULL, NULL, 0, '{\"context\": {\"amount\": 250000, \"reference_number\": null}}', 'processed', '2026-09-02 04:16:18.695', NULL, NULL, 0, '2026-09-02 04:16:19.001', NULL, '2026-09-02 11:16:18.695'),
(8, 1, 1, '43a52551-9043-44a7-af35-06c5b58d9609', 'craft.finance.expense_created', 'craft_finance', 'expense', 8, 'EXP-000008', 2, '727ed37d-edd9-4922-8868-19e1ae40953a', NULL, NULL, 0, '{\"context\": {\"amount\": 100000, \"status_code\": \"draft\"}}', 'processed', '2026-09-02 04:16:18.730', NULL, NULL, 0, '2026-09-02 04:16:19.013', NULL, '2026-09-02 11:16:18.730'),
(9, 1, 1, 'ffb03de2-0471-47d0-8a4a-ec5dff86de4a', 'craft.finance.expense_approved', 'craft_finance', 'expense', 8, 'EXP-000008', 2, 'b2cdcbf2-56b2-4c3b-aec7-2475a7145d5f', NULL, NULL, 0, '{\"context\": {}}', 'processed', '2026-09-02 04:16:18.738', NULL, NULL, 0, '2026-09-02 04:16:19.021', NULL, '2026-09-02 11:16:18.738'),
(10, 1, 1, '9795aed0-bcae-4c03-8090-cbc59cac73d6', 'craft.finance.expense_paid', 'craft_finance', 'expense', 8, 'EXP-000008', 2, 'b6edeea0-1840-4287-9186-b382bcd62fb9', NULL, NULL, 0, '{\"context\": {\"direct_payment\": false, \"transaction_id\": 25}}', 'processed', '2026-09-02 04:16:18.781', NULL, NULL, 0, '2026-09-02 04:16:19.028', NULL, '2026-09-02 11:16:18.781'),
(11, 1, 1, 'b6dc36ee-35d4-4c68-89d1-229c77302b15', 'craft.finance.expense_reversed', 'craft_finance', 'expense', 8, 'EXP-000008', 2, '1276fe20-e55d-4077-b7ac-dd1f0855476b', NULL, NULL, 0, '{\"context\": {\"reason\": \"Smoke test reversal\", \"reversal_transaction_id\": 26}}', 'processed', '2026-09-02 04:16:18.831', NULL, NULL, 0, '2026-09-02 04:16:19.047', NULL, '2026-09-02 11:16:18.831'),
(12, 1, 1, 'a9cfe8ed-36ce-4207-af04-1b1f16ea51c6', 'craft.finance.manual_income_posted', 'craft_finance', 'financial_transaction', 27, 'FTX-000027', 2, '3a55849e-709f-436b-aad2-55fd4016ead8', NULL, NULL, 0, '{\"context\": {\"amount\": 250000, \"reference_number\": null}}', 'processed', '2026-09-02 04:16:32.815', NULL, NULL, 0, '2026-09-02 04:16:33.272', NULL, '2026-09-02 11:16:32.815'),
(13, 1, 1, '545267bf-0875-4cb1-bc80-b98f0d9cd3de', 'craft.finance.expense_created', 'craft_finance', 'expense', 9, 'EXP-000009', 2, '8daef334-5cad-4bd1-ac1f-2a69d36af157', NULL, NULL, 0, '{\"context\": {\"amount\": 100000, \"status_code\": \"draft\"}}', 'processed', '2026-09-02 04:16:32.842', NULL, NULL, 0, '2026-09-02 04:16:33.275', NULL, '2026-09-02 11:16:32.842'),
(14, 1, 1, 'e7ddab00-9515-427f-9153-6da2a27cbed8', 'craft.finance.expense_approved', 'craft_finance', 'expense', 9, 'EXP-000009', 2, '6dae7104-f393-4352-b89f-b88511aeb7f0', NULL, NULL, 0, '{\"context\": {}}', 'processed', '2026-09-02 04:16:32.848', NULL, NULL, 0, '2026-09-02 04:16:33.277', NULL, '2026-09-02 11:16:32.848'),
(15, 1, 1, '807c3ec1-b3d5-4a7f-9139-19ef53cf8309', 'craft.finance.expense_paid', 'craft_finance', 'expense', 9, 'EXP-000009', 2, 'a0013ebc-dbc7-4dbb-8a8b-e152111b4062', NULL, NULL, 0, '{\"context\": {\"direct_payment\": false, \"transaction_id\": 28}}', 'processed', '2026-09-02 04:16:32.873', NULL, NULL, 0, '2026-09-02 04:16:33.279', NULL, '2026-09-02 11:16:32.873'),
(16, 1, 1, '2b71f54d-2f57-4b33-822c-761de97b7fcf', 'craft.finance.expense_reversed', 'craft_finance', 'expense', 9, 'EXP-000009', 2, 'd37336b5-131a-4db9-a119-73603333ee31', NULL, NULL, 0, '{\"context\": {\"reason\": \"Smoke test reversal\", \"reversal_transaction_id\": 29}}', 'processed', '2026-09-02 04:16:32.900', NULL, NULL, 0, '2026-09-02 04:16:33.282', NULL, '2026-09-02 11:16:32.900'),
(17, 1, 1, 'bd436c09-dfbc-4ddf-873d-fda283ad0b4d', 'craft.finance.manual_income_posted', 'craft_finance', 'financial_transaction', 30, 'FTX-000030', 2, '13b8cb2b-1294-4ec1-adcd-74597895c6a0', NULL, NULL, 0, '{\"context\": {\"amount\": 250000, \"reference_number\": null}}', 'processed', '2026-09-02 04:17:03.911', NULL, NULL, 0, '2026-09-02 04:17:04.712', NULL, '2026-09-02 11:17:03.911'),
(18, 1, 1, '4b567e18-7d34-4e2f-b290-8e0e7d25e6e8', 'craft.finance.expense_created', 'craft_finance', 'expense', 10, 'EXP-000010', 2, '52f68465-f55c-4d88-9d15-7c9fcc51a09b', NULL, NULL, 0, '{\"context\": {\"amount\": 100000, \"status_code\": \"draft\"}}', 'processed', '2026-09-02 04:17:03.945', NULL, NULL, 0, '2026-09-02 04:17:04.716', NULL, '2026-09-02 11:17:03.945'),
(19, 1, 1, '79268a09-30f7-4176-84cc-8a5e75af506d', 'craft.finance.expense_approved', 'craft_finance', 'expense', 10, 'EXP-000010', 2, 'ca73da1d-d315-4ea2-bc50-1cf19ef20b56', NULL, NULL, 0, '{\"context\": {}}', 'processed', '2026-09-02 04:17:03.955', NULL, NULL, 0, '2026-09-02 04:17:04.721', NULL, '2026-09-02 11:17:03.955'),
(20, 1, 1, '998e9d3b-5c56-4d59-83c0-b908abfdea9d', 'craft.finance.expense_paid', 'craft_finance', 'expense', 10, 'EXP-000010', 2, '21d926a1-4655-423c-a08b-ed5c39833655', NULL, NULL, 0, '{\"context\": {\"direct_payment\": false, \"transaction_id\": 31}}', 'processed', '2026-09-02 04:17:03.986', NULL, NULL, 0, '2026-09-02 04:17:04.724', NULL, '2026-09-02 11:17:03.986'),
(21, 1, 1, '49032674-7a10-4d5e-8c47-d2aec76bb138', 'craft.finance.expense_reversed', 'craft_finance', 'expense', 10, 'EXP-000010', 2, '02eb2aaf-f24b-4ee6-883d-f8ae9d3ced3a', NULL, NULL, 0, '{\"context\": {\"reason\": \"Smoke test reversal\", \"reversal_transaction_id\": 32}}', 'processed', '2026-09-02 04:17:04.019', NULL, NULL, 0, '2026-09-02 04:17:04.727', NULL, '2026-09-02 11:17:04.019'),
(22, 1, 1, '547fc002-1357-4ae3-9c86-1e7c0bf472cc', 'craft.finance.budget_created', 'craft_finance', 'budget', 4, 'BDG-000004', 2, '53851c3b-dd72-414e-93da-d0e15465e913', NULL, NULL, 0, '{\"context\": {\"total\": 300000, \"item_count\": 1}}', 'processed', '2026-09-02 04:17:04.073', NULL, NULL, 0, '2026-09-02 04:17:04.730', NULL, '2026-09-02 11:17:04.073'),
(23, 1, 1, '395b5717-d6e1-4222-a08c-697ea804734f', 'craft.finance.budget_approved', 'craft_finance', 'budget', 4, 'BDG-000004', 2, '5e013556-834d-4687-80f6-2c00887b0b4d', NULL, NULL, 0, '{\"context\": {}}', 'processed', '2026-09-02 04:17:04.080', NULL, NULL, 0, '2026-09-02 04:17:04.733', NULL, '2026-09-02 11:17:04.080'),
(24, 1, 1, '4e346c52-a70d-42ea-9f6b-a8714fc188c3', 'craft.finance.manual_income_posted', 'craft_finance', 'financial_transaction', 33, 'FTX-000033', 2, '3bff7450-42d1-4dc9-a8d8-cd8a175c41f6', NULL, NULL, 0, '{\"context\": {\"amount\": 250000, \"reference_number\": null}}', 'processed', '2026-09-02 04:21:09.802', NULL, NULL, 0, '2026-09-02 04:21:10.576', NULL, '2026-09-02 11:21:09.802'),
(25, 1, 1, 'b9c7fe5a-9548-469e-bd70-645bfb4e24bb', 'craft.finance.expense_created', 'craft_finance', 'expense', 11, 'EXP-000011', 2, '84483a36-31c2-4c71-b0da-0f118a5a5230', NULL, NULL, 0, '{\"context\": {\"amount\": 100000, \"status_code\": \"draft\"}}', 'processed', '2026-09-02 04:21:09.826', NULL, NULL, 0, '2026-09-02 04:21:10.579', NULL, '2026-09-02 11:21:09.826'),
(26, 1, 1, '02acdb7e-9915-4dc2-bbcf-29d8af63720f', 'craft.finance.expense_approved', 'craft_finance', 'expense', 11, 'EXP-000011', 2, '5800efb5-b4c8-4252-a95c-42b8176b6098', NULL, NULL, 0, '{\"context\": {}}', 'processed', '2026-09-02 04:21:09.833', NULL, NULL, 0, '2026-09-02 04:21:10.581', NULL, '2026-09-02 11:21:09.833'),
(27, 1, 1, 'a0030157-34bd-4160-be3b-66481178b736', 'craft.finance.expense_paid', 'craft_finance', 'expense', 11, 'EXP-000011', 2, '3a1c9a7f-ead8-4c02-ab28-e1b530d6cf9b', NULL, NULL, 0, '{\"context\": {\"direct_payment\": false, \"transaction_id\": 34}}', 'processed', '2026-09-02 04:21:09.856', NULL, NULL, 0, '2026-09-02 04:21:10.585', NULL, '2026-09-02 11:21:09.856'),
(28, 1, 1, 'aac5376f-8af0-4fdf-a85d-1f07568577e5', 'craft.finance.expense_reversed', 'craft_finance', 'expense', 11, 'EXP-000011', 2, 'a13db595-4463-4af6-bd3b-6368b941db01', NULL, NULL, 0, '{\"context\": {\"reason\": \"Smoke test reversal\", \"reversal_transaction_id\": 35}}', 'processed', '2026-09-02 04:21:09.880', NULL, NULL, 0, '2026-09-02 04:21:10.593', NULL, '2026-09-02 11:21:09.880'),
(29, 1, 1, '2641a6c1-2040-49ff-b72c-9d82a66cc27c', 'craft.finance.budget_created', 'craft_finance', 'budget', 5, 'BDG-000005', 2, 'a0b0df7a-b8e2-43e4-833f-f84056b01255', NULL, NULL, 0, '{\"context\": {\"total\": 300000, \"item_count\": 1}}', 'processed', '2026-09-02 04:21:09.927', NULL, NULL, 0, '2026-09-02 04:21:10.596', NULL, '2026-09-02 11:21:09.927'),
(30, 1, 1, '27e56936-43b5-44cc-ab85-7418d3fe8b02', 'craft.finance.budget_approved', 'craft_finance', 'budget', 5, 'BDG-000005', 2, '280f37fe-8efd-4f41-aaab-23c7b4cf96d2', NULL, NULL, 0, '{\"context\": {}}', 'processed', '2026-09-02 04:21:09.934', NULL, NULL, 0, '2026-09-02 04:21:10.599', NULL, '2026-09-02 11:21:09.934'),
(31, 1, 1, '7afd4b40-ec24-4172-89a8-ce6dd3fe6862', 'craft.finance.manual_income_posted', 'craft_finance', 'financial_transaction', 36, 'FTX-000036', 2, '8c95e03e-2dea-4320-8115-1ad7503d603a', NULL, NULL, 0, '{\"context\": {\"amount\": 250000, \"reference_number\": null}}', 'processed', '2026-09-02 04:25:15.006', NULL, NULL, 0, '2026-09-02 04:25:15.038', NULL, '2026-09-02 11:25:15.006'),
(32, 1, 1, '63ca5855-c57e-40e3-b86a-2394d21f2f6a', 'craft.finance.expense_created', 'craft_finance', 'expense', 12, 'EXP-000012', 2, '80f0bb81-d247-47e4-85f7-e8386e513fdc', NULL, NULL, 0, '{\"context\": {\"amount\": 100000, \"status_code\": \"draft\"}}', 'processed', '2026-09-02 04:25:15.033', NULL, NULL, 0, '2026-09-02 04:25:16.052', NULL, '2026-09-02 11:25:15.033'),
(33, 1, 1, '550e7bc9-a86a-4636-bca0-ea9ec0704db6', 'craft.finance.expense_approved', 'craft_finance', 'expense', 12, 'EXP-000012', 2, '398e36ea-c677-44db-89c3-5730659b9a83', NULL, NULL, 0, '{\"context\": {}}', 'processed', '2026-09-02 04:25:15.043', NULL, NULL, 0, '2026-09-02 04:25:16.055', NULL, '2026-09-02 11:25:15.043'),
(34, 1, 1, '5e081484-80a2-4462-a7a5-12dbe409a8f4', 'craft.finance.expense_paid', 'craft_finance', 'expense', 12, 'EXP-000012', 2, '6545a8c6-4404-4c3d-99fd-6d9961d55896', NULL, NULL, 0, '{\"context\": {\"direct_payment\": false, \"transaction_id\": 37}}', 'processed', '2026-09-02 04:25:15.068', NULL, NULL, 0, '2026-09-02 04:25:16.058', NULL, '2026-09-02 11:25:15.068'),
(35, 1, 1, '1b032fea-4b2c-409e-bf02-7b06345ed9a4', 'craft.finance.expense_reversed', 'craft_finance', 'expense', 12, 'EXP-000012', 2, 'd3e3df61-6f3c-4cbb-a5c4-95d75ba4ca2a', NULL, NULL, 0, '{\"context\": {\"reason\": \"Smoke test reversal\", \"reversal_transaction_id\": 38}}', 'processed', '2026-09-02 04:25:15.098', NULL, NULL, 0, '2026-09-02 04:25:16.062', NULL, '2026-09-02 11:25:15.098'),
(36, 1, 1, '7d9c73a8-ab1d-44de-9848-e463c9f7dea0', 'craft.finance.budget_created', 'craft_finance', 'budget', 6, 'BDG-000006', 2, 'e0b22e6f-9659-4c55-98a4-b9c44c200259', NULL, NULL, 0, '{\"context\": {\"total\": 300000, \"item_count\": 1}}', 'processed', '2026-09-02 04:25:15.153', NULL, NULL, 0, '2026-09-02 04:25:16.065', NULL, '2026-09-02 11:25:15.153'),
(37, 1, 1, '709a93ee-886e-45aa-b0a8-d2eadc041283', 'craft.finance.budget_approved', 'craft_finance', 'budget', 6, 'BDG-000006', 2, 'ff4104a4-81db-4e66-9a1b-4c0856034906', NULL, NULL, 0, '{\"context\": {}}', 'processed', '2026-09-02 04:25:15.161', NULL, NULL, 0, '2026-09-02 04:25:16.070', NULL, '2026-09-02 11:25:15.161');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `expense_code` varchar(80) NOT NULL,
  `category_id` bigint UNSIGNED DEFAULT NULL,
  `party_id` bigint UNSIGNED DEFAULT NULL,
  `treasury_account_id` bigint UNSIGNED DEFAULT NULL,
  `financial_transaction_id` bigint UNSIGNED DEFAULT NULL,
  `craft_order_id` bigint UNSIGNED DEFAULT NULL,
  `studio_project_id` bigint UNSIGNED DEFAULT NULL,
  `expense_date` datetime(3) NOT NULL,
  `description` varchar(500) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `status_code` varchar(30) NOT NULL DEFAULT 'paid' COMMENT 'draft|approved|paid|void',
  `receipt_path` varchar(500) DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `filament_spools`
--

CREATE TABLE `filament_spools` (
  `id` bigint UNSIGNED NOT NULL,
  `material_batch_id` bigint UNSIGNED NOT NULL,
  `spool_code` varchar(80) NOT NULL,
  `diameter_mm` decimal(6,3) NOT NULL DEFAULT '1.750',
  `nominal_net_weight_g` decimal(12,3) DEFAULT NULL,
  `tare_weight_g` decimal(12,3) DEFAULT NULL,
  `current_net_weight_g` decimal(12,3) DEFAULT NULL,
  `opened_at` datetime(3) DEFAULT NULL,
  `dried_at` datetime(3) DEFAULT NULL,
  `storage_location` varchar(120) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `financial_periods`
--

CREATE TABLE `financial_periods` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `period_code` varchar(30) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status_code` varchar(20) NOT NULL DEFAULT 'open' COMMENT 'open|closed|locked',
  `closed_by` bigint UNSIGNED DEFAULT NULL,
  `closed_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `financial_transactions`
--

CREATE TABLE `financial_transactions` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `transaction_code` varchar(80) NOT NULL,
  `transaction_date` datetime(3) NOT NULL,
  `transaction_type` varchar(30) NOT NULL COMMENT 'income|expense|transfer|adjustment',
  `category_id` bigint UNSIGNED DEFAULT NULL,
  `treasury_account_id` bigint UNSIGNED DEFAULT NULL,
  `party_id` bigint UNSIGNED DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `description` varchar(500) NOT NULL,
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint UNSIGNED DEFAULT NULL,
  `source_code` varchar(100) DEFAULT NULL,
  `idempotency_key` varchar(190) DEFAULT NULL COMMENT 'Client/request idempotency key for retry-safe financial posting',
  `status_code` varchar(30) NOT NULL DEFAULT 'posted' COMMENT 'draft|posted|void',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `posted_by` bigint UNSIGNED DEFAULT NULL,
  `posted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `goods_receipts`
--

CREATE TABLE `goods_receipts` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `receipt_number` varchar(80) NOT NULL,
  `purchase_order_id` bigint UNSIGNED NOT NULL,
  `received_at` datetime(3) NOT NULL,
  `received_by` bigint UNSIGNED DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'received',
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `goods_receipt_items`
--

CREATE TABLE `goods_receipt_items` (
  `id` bigint UNSIGNED NOT NULL,
  `goods_receipt_id` bigint UNSIGNED NOT NULL,
  `purchase_order_item_id` bigint UNSIGNED NOT NULL,
  `material_batch_id` bigint UNSIGNED DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `accepted_qty` decimal(18,4) NOT NULL,
  `rejected_qty` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `rejection_reason` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `integrations`
--

CREATE TABLE `integrations` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `sales_channel_id` bigint UNSIGNED DEFAULT NULL,
  `integration_code` varchar(80) NOT NULL,
  `integration_type` varchar(50) NOT NULL COMMENT 'marketplace|google|messaging|payment|api|webhook|other',
  `provider_name` varchar(120) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'not_connected' COMMENT 'not_connected|connected|error|disabled|planned',
  `config_json` json DEFAULT NULL COMMENT 'Do not store raw secrets; use encrypted secret storage in backend',
  `last_sync_at` datetime(3) DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `integration_secrets`
--

CREATE TABLE `integration_secrets` (
  `id` bigint UNSIGNED NOT NULL,
  `integration_id` bigint UNSIGNED NOT NULL,
  `secret_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_version` smallint UNSIGNED NOT NULL DEFAULT '1',
  `ciphertext` longblob NOT NULL,
  `iv` varbinary(12) NOT NULL,
  `auth_tag` varbinary(16) NOT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AES-256-GCM encrypted integration credentials. Never store plaintext secrets here or anywhere else.';

-- --------------------------------------------------------

--
-- Table structure for table `integration_sync_logs`
--

CREATE TABLE `integration_sync_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `integration_id` bigint UNSIGNED NOT NULL,
  `sync_type` varchar(60) NOT NULL,
  `direction` varchar(20) NOT NULL DEFAULT 'inbound' COMMENT 'inbound|outbound|bidirectional',
  `status_code` varchar(30) NOT NULL COMMENT 'running|success|partial|failed',
  `started_at` datetime(3) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `records_processed` int UNSIGNED NOT NULL DEFAULT '0',
  `records_success` int UNSIGNED NOT NULL DEFAULT '0',
  `records_failed` int UNSIGNED NOT NULL DEFAULT '0',
  `error_message` text,
  `metadata` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `internal_transfers`
--

CREATE TABLE `internal_transfers` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `transfer_code` varchar(80) NOT NULL,
  `from_business_unit_id` bigint UNSIGNED NOT NULL,
  `to_business_unit_id` bigint UNSIGNED NOT NULL,
  `from_treasury_account_id` bigint UNSIGNED NOT NULL,
  `to_treasury_account_id` bigint UNSIGNED NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `transfer_date` datetime(3) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `idempotency_key` varchar(190) DEFAULT NULL COMMENT 'Client/request idempotency key for retry-safe treasury transfer',
  `status_code` varchar(30) NOT NULL DEFAULT 'completed' COMMENT 'draft|completed|void',
  `journal_entry_id` bigint UNSIGNED DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_movements`
--

CREATE TABLE `inventory_movements` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `material_id` bigint UNSIGNED NOT NULL,
  `material_batch_id` bigint UNSIGNED DEFAULT NULL,
  `movement_type` varchar(40) NOT NULL COMMENT 'stock_in|production_usage|waste|adjustment_in|adjustment_out|return_in|return_out|reservation|release',
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint UNSIGNED NOT NULL,
  `unit_cost` decimal(18,4) DEFAULT NULL,
  `total_cost` decimal(18,2) DEFAULT NULL,
  `reference_type` varchar(60) DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `reference_code` varchar(100) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `occurred_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `invoice_number` varchar(80) NOT NULL,
  `party_id` bigint UNSIGNED NOT NULL,
  `quotation_id` bigint UNSIGNED DEFAULT NULL,
  `source_type` varchar(50) DEFAULT NULL COMMENT 'craft_order|studio_project|manual',
  `source_id` bigint UNSIGNED DEFAULT NULL,
  `issue_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'draft' COMMENT 'draft|issued|partial|paid|overdue|void|refunded',
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `balance_due` decimal(18,2) NOT NULL DEFAULT '0.00',
  `payment_terms` varchar(255) DEFAULT NULL,
  `notes` text,
  `pdf_path` varchar(500) DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `issued_at` datetime(3) DEFAULT NULL,
  `paid_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` bigint UNSIGNED NOT NULL,
  `invoice_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `service_id` bigint UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `unit_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_payment_schedules`
--

CREATE TABLE `invoice_payment_schedules` (
  `id` bigint UNSIGNED NOT NULL,
  `invoice_id` bigint UNSIGNED NOT NULL,
  `installment_no` int UNSIGNED NOT NULL,
  `label` varchar(120) DEFAULT NULL COMMENT 'DP, Termin 2, Pelunasan, etc',
  `due_date` date NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `paid_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|partial|paid|overdue|cancelled',
  `paid_at` datetime(3) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `journal_entries`
--

CREATE TABLE `journal_entries` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `financial_period_id` bigint UNSIGNED DEFAULT NULL,
  `journal_number` varchar(80) NOT NULL,
  `entry_date` datetime(3) NOT NULL,
  `description` varchar(500) NOT NULL,
  `source_transaction_id` bigint UNSIGNED DEFAULT NULL,
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint UNSIGNED DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'posted' COMMENT 'draft|posted|reversed',
  `reversal_of_id` bigint UNSIGNED DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `posted_by` bigint UNSIGNED DEFAULT NULL,
  `posted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `journal_entries`
--

INSERT INTO `journal_entries` (`id`, `organization_id`, `business_unit_id`, `financial_period_id`, `journal_number`, `entry_date`, `description`, `source_transaction_id`, `source_type`, `source_id`, `status_code`, `reversal_of_id`, `created_by`, `posted_by`, `posted_at`, `created_at`) VALUES
(5, 1, 1, NULL, 'JRN-000005', '2026-09-02 02:37:33.000', 'Pembalikan EXP-000001: Smoke test reversal', NULL, 'studio_expense_reversal', 1, 'posted', NULL, 2, 2, '2026-09-02 02:37:33.000', '2026-09-02 09:37:33.341');

-- --------------------------------------------------------

--
-- Table structure for table `journal_lines`
--

CREATE TABLE `journal_lines` (
  `id` bigint UNSIGNED NOT NULL,
  `journal_entry_id` bigint UNSIGNED NOT NULL,
  `coa_account_id` bigint UNSIGNED NOT NULL,
  `party_id` bigint UNSIGNED DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `debit_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `credit_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `journal_lines`
--

INSERT INTO `journal_lines` (`id`, `journal_entry_id`, `coa_account_id`, `party_id`, `description`, `debit_amount`, `credit_amount`, `sort_order`) VALUES
(9, 5, 7, NULL, 'Pembalikan EXP-000001: Smoke test reversal', 100000.00, 0.00, 0),
(10, 5, 9, NULL, 'Pembalikan EXP-000001: Smoke test reversal', 0.00, 100000.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `login_history`
--

CREATE TABLE `login_history` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `login_identifier` varchar(190) DEFAULT NULL,
  `success` tinyint(1) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `failure_reason` varchar(255) DEFAULT NULL,
  `logged_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_fee_rules`
--

CREATE TABLE `marketplace_fee_rules` (
  `id` bigint UNSIGNED NOT NULL,
  `sales_channel_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `fee_type` varchar(30) NOT NULL COMMENT 'percentage|fixed|mixed',
  `percentage_rate` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `fixed_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `applies_to` varchar(30) NOT NULL DEFAULT 'gross_sales',
  `effective_from` date NOT NULL,
  `effective_until` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_settlements`
--

CREATE TABLE `marketplace_settlements` (
  `id` bigint UNSIGNED NOT NULL,
  `sales_channel_id` bigint UNSIGNED NOT NULL,
  `settlement_code` varchar(100) NOT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `settled_at` datetime(3) DEFAULT NULL,
  `gross_sales` decimal(18,2) NOT NULL DEFAULT '0.00',
  `platform_fees` decimal(18,2) NOT NULL DEFAULT '0.00',
  `vouchers_subsidies` decimal(18,2) NOT NULL DEFAULT '0.00',
  `shipping_adjustments` decimal(18,2) NOT NULL DEFAULT '0.00',
  `other_adjustments` decimal(18,2) NOT NULL DEFAULT '0.00',
  `net_settlement` decimal(18,2) NOT NULL DEFAULT '0.00',
  `treasury_account_id` bigint UNSIGNED DEFAULT NULL,
  `financial_transaction_id` bigint UNSIGNED DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|received|reconciled',
  `external_reference` varchar(190) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_settlement_items`
--

CREATE TABLE `marketplace_settlement_items` (
  `id` bigint UNSIGNED NOT NULL,
  `settlement_id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED DEFAULT NULL,
  `external_order_id` varchar(190) DEFAULT NULL,
  `gross_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `fee_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `adjustment_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(18,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `master_options`
--

CREATE TABLE `master_options` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `group_key` varchar(80) NOT NULL,
  `code` varchar(80) NOT NULL,
  `label` varchar(150) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `materials`
--

CREATE TABLE `materials` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `category_id` bigint UNSIGNED NOT NULL,
  `sku` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `brand` varchar(120) DEFAULT NULL,
  `material_type` varchar(80) DEFAULT NULL COMMENT 'PLA|PETG|ABS|TPU|resin|magnet|screw|etc',
  `color_name` varchar(100) DEFAULT NULL,
  `color_hex` varchar(10) DEFAULT NULL,
  `base_unit_id` bigint UNSIGNED NOT NULL,
  `default_unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `low_stock_threshold` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reorder_qty` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `preferred_supplier_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_batches`
--

CREATE TABLE `material_batches` (
  `id` bigint UNSIGNED NOT NULL,
  `material_id` bigint UNSIGNED NOT NULL,
  `batch_code` varchar(80) NOT NULL,
  `supplier_id` bigint UNSIGNED DEFAULT NULL,
  `purchase_order_item_id` bigint UNSIGNED DEFAULT NULL COMMENT 'Populated after procurement tables exist; application-level link in v1',
  `received_at` datetime(3) DEFAULT NULL,
  `initial_qty` decimal(18,4) NOT NULL,
  `current_qty` decimal(18,4) NOT NULL,
  `reserved_qty` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `expiry_date` date DEFAULT NULL,
  `location_code` varchar(80) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'available',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_categories`
--

CREATE TABLE `material_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category_type` varchar(30) NOT NULL COMMENT 'filament|resin|hardware|packaging|consumable|other',
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_waste`
--

CREATE TABLE `material_waste` (
  `id` bigint UNSIGNED NOT NULL,
  `material_id` bigint UNSIGNED NOT NULL,
  `material_batch_id` bigint UNSIGNED DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint UNSIGNED NOT NULL,
  `waste_reason` varchar(50) NOT NULL COMMENT 'failed_print|support|purge|calibration|scrap|other',
  `print_job_id` bigint UNSIGNED DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `occurred_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` bigint UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL COMMENT 'NULL = broadcast',
  `notification_type` varchar(60) NOT NULL,
  `module_code` varchar(80) DEFAULT NULL COMMENT 'Canonical source module for filtering and presentation',
  `severity_code` varchar(20) NOT NULL DEFAULT 'info' COMMENT 'info|success|warning|error|critical',
  `title` varchar(180) NOT NULL,
  `message` text NOT NULL,
  `action_url` varchar(500) DEFAULT NULL,
  `entity_type` varchar(60) DEFAULT NULL,
  `entity_id` bigint UNSIGNED DEFAULT NULL,
  `dedupe_key` varchar(190) DEFAULT NULL COMMENT 'Optional idempotency key; unique when non-NULL',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `organization_id`, `business_unit_id`, `user_id`, `notification_type`, `module_code`, `severity_code`, `title`, `message`, `action_url`, `entity_type`, `entity_id`, `dedupe_key`, `is_read`, `read_at`, `created_at`) VALUES
(1, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:1:policy:craft-order-created:user:3', 0, NULL, '2026-09-02 02:59:05.946'),
(2, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:1:policy:craft-order-created:user:4', 0, NULL, '2026-09-02 02:59:05.954'),
(3, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:1:policy:craft-order-created:user:5', 0, NULL, '2026-09-02 02:59:05.958'),
(4, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:1:policy:craft-order-created:user:6', 0, NULL, '2026-09-02 02:59:05.963'),
(5, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:1:policy:craft-order-created:user:7', 0, NULL, '2026-09-02 02:59:05.968'),
(6, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:1:policy:craft-order-created:user:8', 0, NULL, '2026-09-02 02:59:05.976'),
(7, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:1:policy:craft-order-created:user:9', 0, NULL, '2026-09-02 02:59:05.980'),
(8, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:1:policy:craft-order-created:user:10', 0, NULL, '2026-09-02 02:59:05.986'),
(9, 1, NULL, 2, 'system', 'users', 'info', 'Permohonan akun baru', 'QA User 1 mengajukan akun UNI-NEXUS dan menunggu peninjauan.', '/app/users', 'user', 394, NULL, 1, '2026-09-09 04:23:27.416', '2026-09-09 01:42:55.416'),
(10, 1, NULL, 3, 'system', 'users', 'info', 'Permohonan akun baru', 'QA User 1 mengajukan akun UNI-NEXUS dan menunggu peninjauan.', '/app/users', 'user', 394, NULL, 0, NULL, '2026-09-09 01:42:55.420'),
(11, 1, NULL, 4, 'system', 'users', 'info', 'Permohonan akun baru', 'QA User 1 mengajukan akun UNI-NEXUS dan menunggu peninjauan.', '/app/users', 'user', 394, NULL, 0, NULL, '2026-09-09 01:42:55.422'),
(12, 1, NULL, 394, 'system', 'users', 'success', 'Akun Anda disetujui', 'Akun UNI-NEXUS Anda telah aktif. Selamat datang!', '/app/dashboard', 'user', 394, NULL, 1, '2026-09-09 02:17:10.973', '2026-09-09 02:10:58.477'),
(13, 1, NULL, 3, 'system', 'users', 'info', 'Permohonan akun baru', 'QA User 2 mengajukan akun UNI-NEXUS dan menunggu peninjauan.', '/app/users', 'user', 395, NULL, 0, NULL, '2026-09-09 02:52:41.135'),
(14, 1, NULL, 2, 'system', 'users', 'info', 'Permohonan akun baru', 'QA User 2 mengajukan akun UNI-NEXUS dan menunggu peninjauan.', '/app/users', 'user', 395, NULL, 1, '2026-09-09 04:23:27.416', '2026-09-09 02:52:41.137'),
(15, 1, NULL, 4, 'system', 'users', 'info', 'Permohonan akun baru', 'QA User 2 mengajukan akun UNI-NEXUS dan menunggu peninjauan.', '/app/users', 'user', 395, NULL, 0, NULL, '2026-09-09 02:52:41.138'),
(16, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 1, NULL, 0, NULL, '2026-09-09 07:27:12.518'),
(17, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 1, NULL, 1, '2026-09-09 07:27:48.302', '2026-09-09 07:27:12.521'),
(18, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 1, NULL, 0, NULL, '2026-09-09 07:27:12.525'),
(19, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 2, NULL, 0, NULL, '2026-09-09 07:27:43.485'),
(20, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 2, NULL, 1, '2026-09-09 07:27:48.302', '2026-09-09 07:27:43.487'),
(21, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 2, NULL, 0, NULL, '2026-09-09 07:27:43.489');

-- --------------------------------------------------------

--
-- Table structure for table `order_attachments`
--

CREATE TABLE `order_attachments` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(60) DEFAULT NULL,
  `storage_path` varchar(500) NOT NULL,
  `file_size_bytes` bigint UNSIGNED DEFAULT NULL,
  `attachment_type` varchar(40) NOT NULL DEFAULT 'reference' COMMENT 'reference|brief|approval|design|other',
  `uploaded_by` bigint UNSIGNED DEFAULT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations`
--

CREATE TABLE `organizations` (
  `id` bigint UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `legal_name` varchar(200) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country_code` char(2) NOT NULL DEFAULT 'ID',
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Jakarta',
  `logo_path` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `organizations`
--

INSERT INTO `organizations` (`id`, `code`, `name`, `legal_name`, `email`, `phone`, `address`, `city`, `province`, `postal_code`, `country_code`, `currency_code`, `timezone`, `logo_path`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'UNI-INSIDE', 'Uni-Inside Studio', 'Uni-Inside Studio', 'uninsidemed@gmail.com', '6281316556908', 'Jl. Telekomunikasi No. 1, Sukapura, Kec. Dayeuhkolot.', 'Kabupaten Bandung', 'Jawa Barat', '40257', 'ID', 'IDR', 'Asia/Jakarta', 'organization-logos/1/e8aaa11b-841f-466a-8471-da74a7010625.webp', 1, '2026-08-22 07:48:09.689', '2026-09-10 01:30:07.905');

-- --------------------------------------------------------

--
-- Table structure for table `parties`
--

CREATE TABLE `parties` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `code` varchar(60) NOT NULL,
  `party_kind` varchar(30) NOT NULL COMMENT 'individual|company|institution|internal',
  `display_name` varchar(200) NOT NULL,
  `legal_name` varchar(250) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country_code` char(2) NOT NULL DEFAULT 'ID',
  `notes` text,
  `status_code` varchar(30) NOT NULL DEFAULT 'active',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `partner_price_rules`
--

CREATE TABLE `partner_price_rules` (
  `id` bigint UNSIGNED NOT NULL,
  `partner_party_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `variant_id` bigint UNSIGNED DEFAULT NULL,
  `minimum_qty` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `special_price` decimal(18,2) DEFAULT NULL,
  `discount_percent` decimal(8,3) DEFAULT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `party_contacts`
--

CREATE TABLE `party_contacts` (
  `id` bigint UNSIGNED NOT NULL,
  `party_id` bigint UNSIGNED NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `job_title` varchar(120) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `whatsapp` varchar(50) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `party_roles`
--

CREATE TABLE `party_roles` (
  `id` bigint UNSIGNED NOT NULL,
  `party_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `role_code` varchar(50) NOT NULL COMMENT 'craft_customer|craft_partner|studio_client|supplier|vendor|freelancer|studio_partner',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `payment_code` varchar(80) NOT NULL,
  `invoice_id` bigint UNSIGNED DEFAULT NULL,
  `supplier_invoice_id` bigint UNSIGNED DEFAULT NULL,
  `payment_schedule_id` bigint UNSIGNED DEFAULT NULL,
  `party_id` bigint UNSIGNED DEFAULT NULL,
  `payment_method_id` bigint UNSIGNED DEFAULT NULL,
  `treasury_account_id` bigint UNSIGNED DEFAULT NULL,
  `financial_transaction_id` bigint UNSIGNED DEFAULT NULL,
  `payment_direction` varchar(20) NOT NULL DEFAULT 'in' COMMENT 'in|out',
  `payment_date` datetime(3) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `reference_number` varchar(190) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'confirmed' COMMENT 'pending|confirmed|failed|refunded|void',
  `notes` varchar(500) DEFAULT NULL,
  `received_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--

CREATE TABLE `payment_methods` (
  `id` bigint UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `method_type` varchar(30) NOT NULL COMMENT 'cash|bank_transfer|ewallet|marketplace|other',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint UNSIGNED NOT NULL,
  `code` varchar(120) NOT NULL,
  `module_code` varchar(60) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `code`, `module_code`, `name`, `description`, `created_at`) VALUES
(1, 'dashboard.read', 'dashboard', 'Lihat Dasbor', NULL, '2026-08-22 07:48:09.733'),
(2, 'craft.orders.read', 'craft_orders', 'Lihat Pesanan Craft', NULL, '2026-08-22 07:48:09.733'),
(3, 'craft.orders.write', 'craft_orders', 'Kelola Pesanan Craft', NULL, '2026-08-22 07:48:09.733'),
(4, 'craft.production.read', 'craft_production', 'Lihat Produksi Craft', NULL, '2026-08-22 07:48:09.733'),
(5, 'craft.production.write', 'craft_production', 'Kelola Produksi Craft', NULL, '2026-08-22 07:48:09.733'),
(6, 'craft.products.read', 'craft_products', 'Lihat Produk Craft', NULL, '2026-08-22 07:48:09.733'),
(7, 'craft.products.write', 'craft_products', 'Kelola Produk Craft', NULL, '2026-08-22 07:48:09.733'),
(8, 'craft.printers.read', 'craft_printers', 'Lihat Printer', NULL, '2026-08-22 07:48:09.733'),
(9, 'craft.printers.write', 'craft_printers', 'Kelola Printer', NULL, '2026-08-22 07:48:09.733'),
(10, 'craft.materials.read', 'craft_materials', 'Lihat Material', NULL, '2026-08-22 07:48:09.733'),
(11, 'craft.materials.write', 'craft_materials', 'Kelola Material', NULL, '2026-08-22 07:48:09.733'),
(12, 'craft.finance.read', 'craft_finance', 'Lihat Keuangan Craft', NULL, '2026-08-22 07:48:09.733'),
(13, 'craft.finance.write', 'craft_finance', 'Kelola Keuangan Craft', NULL, '2026-08-22 07:48:09.733'),
(14, 'studio.projects.read', 'studio_projects', 'Lihat Proyek Studio', NULL, '2026-08-22 07:48:09.733'),
(15, 'studio.projects.write', 'studio_projects', 'Kelola Proyek Studio', NULL, '2026-08-22 07:48:09.733'),
(16, 'studio.clients.read', 'studio_clients', 'Lihat Klien Studio', NULL, '2026-08-22 07:48:09.733'),
(17, 'studio.clients.write', 'studio_clients', 'Kelola Klien Studio', NULL, '2026-08-22 07:48:09.733'),
(18, 'studio.finance.read', 'studio_finance', 'Lihat Keuangan Studio', NULL, '2026-08-22 07:48:09.733'),
(19, 'studio.finance.write', 'studio_finance', 'Kelola Keuangan Studio', NULL, '2026-08-22 07:48:09.733'),
(20, 'finance.unified.read', 'unified_finance', 'Lihat Keuangan Terpadu', NULL, '2026-08-22 07:48:09.733'),
(21, 'finance.unified.write', 'unified_finance', 'Kelola Keuangan Terpadu', NULL, '2026-08-22 07:48:09.733'),
(22, 'users.manage', 'users', 'Kelola Pengguna dan Hak Akses', NULL, '2026-08-22 07:48:09.733'),
(23, 'settings.manage', 'settings', 'Kelola Pengaturan', NULL, '2026-08-22 07:48:09.733'),
(24, 'audit.read', 'audit', 'Lihat Log Audit', NULL, '2026-08-22 07:48:09.733'),
(25, 'reports.export', 'reports', 'Ekspor Laporan', NULL, '2026-08-22 07:48:09.733'),
(26, 'craft.customers.read', 'craft_customers', 'Lihat Pelanggan & Mitra Craft', 'Melihat data pelanggan, mitra, kontak, riwayat pesanan, dan informasi terkait di Uni-Inside Craft.', '2026-08-26 15:19:36.759'),
(27, 'craft.customers.write', 'craft_customers', 'Kelola Pelanggan & Mitra Craft', 'Membuat, mengubah, mengaktifkan, menonaktifkan, serta mengelola pelanggan, mitra, kontak, dan harga khusus mitra Uni-Inside Craft.', '2026-08-26 15:19:36.782'),
(28, 'craft.procurement.read', 'craft_procurement', 'Lihat Pengadaan Craft', 'Melihat pemasok, permintaan pembelian, pesanan pembelian, penerimaan barang, tagihan pemasok, dan riwayat pengadaan Uni-Inside Craft.', '2026-08-26 19:57:36.394'),
(29, 'craft.procurement.write', 'craft_procurement', 'Kelola Pengadaan Craft', 'Membuat dan mengelola pemasok, permintaan pembelian, pesanan pembelian, penerimaan barang, dan tagihan pemasok Uni-Inside Craft.', '2026-08-26 19:57:36.475'),
(30, 'craft.analytics.read', 'craft_analytics', 'Lihat Laporan & Analitik Craft', 'Melihat seluruh laporan dan analitik operasional Uni-Inside Craft.', '2026-08-27 09:20:16.880'),
(31, 'craft.analytics.export', 'craft_analytics', 'Ekspor Laporan Craft', 'Menghasilkan dan mengunduh laporan Craft dalam format PDF, XLSX, atau CSV.', '2026-08-27 09:20:17.137'),
(32, 'craft.marketplace.read', 'craft_marketplace', 'Lihat Marketplace & Kanal Penjualan', 'Melihat kanal penjualan, pemetaan produk, biaya marketplace, settlement, dan status integrasi Craft.', '2026-08-27 10:25:39.250'),
(33, 'craft.marketplace.write', 'craft_marketplace', 'Kelola Marketplace & Kanal Penjualan', 'Mengelola kanal penjualan, pemetaan produk, aturan biaya marketplace, settlement, dan konfigurasi marketplace Craft.', '2026-08-27 10:25:39.281'),
(34, 'craft.marketplace.sync', 'craft_marketplace', 'Sinkronisasi Marketplace Craft', 'Menjalankan impor atau sinkronisasi pesanan dan data marketplace ke UNI-NEXUS.', '2026-08-27 10:25:39.309'),
(35, 'craft.automations.read', 'craft_automations', 'Lihat Otomasi Craft', 'Melihat aturan, status, template, dan riwayat eksekusi otomasi Uni-Inside Craft.', '2026-08-27 11:21:01.746'),
(36, 'craft.automations.write', 'craft_automations', 'Kelola Otomasi Craft', 'Membuat, mengubah, mengaktifkan, menjeda, dan menonaktifkan aturan otomasi Uni-Inside Craft.', '2026-08-27 11:21:01.776'),
(37, 'craft.automations.run', 'craft_automations', 'Jalankan Otomasi Craft', 'Menguji dan menjalankan aturan otomasi Uni-Inside Craft secara manual.', '2026-08-27 11:21:01.802'),
(38, 'studio.services.read', 'studio_services', 'Lihat Layanan Studio', 'Melihat katalog layanan, kategori, paket, harga dasar, dan penggunaan layanan Uni-Inside Studio.', '2026-08-27 15:54:03.433'),
(39, 'studio.services.write', 'studio_services', 'Kelola Layanan Studio', 'Membuat, mengubah, mengaktifkan, menonaktifkan, dan mengelola paket layanan Uni-Inside Studio.', '2026-08-27 15:54:03.477'),
(40, 'studio.equipment.read', 'studio_equipment', 'Lihat Peralatan & Aset Studio', 'Melihat inventaris aset, penggunaan proyek, penanggung jawab, nilai, dan riwayat perawatan Uni-Inside Studio.', '2026-08-27 16:45:45.203'),
(41, 'studio.equipment.write', 'studio_equipment', 'Kelola Peralatan & Aset Studio', 'Membuat dan memperbarui aset, mengatur status, penugasan proyek, penanggung jawab, serta perawatan aset Uni-Inside Studio.', '2026-08-27 16:45:45.235'),
(42, 'studio.billing.read', 'studio_billing', 'Lihat Penawaran & Penagihan Studio', 'Melihat penawaran, invoice, jadwal pembayaran, dokumen komersial, dan tagihan belum dibayar Uni-Inside Studio.', '2026-08-27 21:12:05.951'),
(43, 'studio.billing.write', 'studio_billing', 'Kelola Penawaran & Penagihan Studio', 'Membuat dan mengelola penawaran, invoice, jadwal pembayaran, serta lifecycle penagihan Uni-Inside Studio.', '2026-08-27 21:12:05.978'),
(44, 'studio.vendors.read', 'studio_vendors', 'Lihat Vendor / Freelancer / Mitra Studio', 'Melihat direktori pihak eksternal, kontak, peran, riwayat proyek, nilai penugasan, dan hubungan bisnis Uni-Inside Studio.', '2026-08-27 22:32:07.126'),
(45, 'studio.vendors.write', 'studio_vendors', 'Kelola Vendor / Freelancer / Mitra Studio', 'Membuat, memperbarui, mengaktifkan, menonaktifkan, dan mengelola hubungan Vendor, Freelancer, serta Mitra Uni-Inside Studio.', '2026-08-27 22:32:07.156'),
(46, 'studio.analytics.read', 'studio_analytics', 'Lihat Laporan & Analitik Studio', 'Melihat laporan, KPI, tren proyek, klien, layanan, keuangan, penagihan, pihak eksternal, dan aset Uni-Inside Studio.', '2026-08-28 00:24:01.323'),
(47, 'studio.analytics.export', 'studio_analytics', 'Ekspor Laporan Studio', 'Menghasilkan dan mengunduh laporan analitik Uni-Inside Studio dalam format CSV, XLSX, atau PDF.', '2026-08-28 00:24:01.352'),
(48, 'studio.automations.read', 'studio_automations', 'Lihat Otomasi Studio', 'Melihat aturan, template, pemicu, aksi, status worker, dan riwayat eksekusi otomasi Uni-Inside Studio.', '2026-08-28 05:18:25.985'),
(49, 'studio.automations.write', 'studio_automations', 'Kelola Otomasi Studio', 'Membuat, mengubah, mengaktifkan, menjeda, melanjutkan, dan menonaktifkan aturan otomasi Uni-Inside Studio.', '2026-08-28 05:18:26.019'),
(50, 'studio.automations.run', 'studio_automations', 'Jalankan Otomasi Studio', 'Menguji dan menjalankan aturan otomasi Uni-Inside Studio secara manual.', '2026-08-28 05:18:26.053'),
(51, 'documents.read', 'documents', 'Lihat Pusat Dokumen', 'Melihat, mencari, membuka, dan mengunduh dokumen yang dapat diakses di Pusat Dokumen UNI-NEXUS.', '2026-08-31 09:05:42.710'),
(52, 'documents.write', 'documents', 'Kelola Dokumen', 'Mengunggah, memperbarui metadata, dan menambahkan versi dokumen manual UNI-NEXUS.', '2026-08-31 09:05:42.713'),
(53, 'documents.manage', 'documents', 'Administrasi Pusat Dokumen', 'Mengelola dokumen global, arsip, pemulihan, dan fungsi administratif Pusat Dokumen.', '2026-08-31 09:05:42.717'),
(54, 'calendar.read', 'calendar', 'Lihat Kalender', 'Melihat kalender global serta jadwal Craft dan Studio yang diizinkan.', '2026-08-31 10:00:11.942'),
(55, 'calendar.write', 'calendar', 'Kelola Acara Kalender', 'Membuat dan memperbarui acara kalender manual pada workspace yang dapat diakses.', '2026-08-31 10:00:11.942'),
(56, 'calendar.manage', 'calendar', 'Administrasi Kalender', 'Mengelola acara kalender global dan acara manual lintas pengguna yang diizinkan.', '2026-08-31 10:00:11.942'),
(57, 'tasks.read', 'tasks', 'Lihat Tugas', 'Melihat tugas UNI-NEXUS pada organisasi dan workspace yang diizinkan.', '2026-08-31 10:00:11.945'),
(58, 'tasks.write', 'tasks', 'Kelola Tugas', 'Membuat tugas dan memperbarui tugas yang menjadi tanggung jawab pengguna.', '2026-08-31 10:00:11.945'),
(59, 'tasks.manage', 'tasks', 'Administrasi Tugas', 'Mengelola penugasan, arsip, dan tugas global pada organisasi.', '2026-08-31 10:00:11.945'),
(60, 'finance.read', 'finance', 'Lihat Keuangan Terpadu', 'Melihat kondisi keuangan gabungan Craft, Studio, dan Shared yang diizinkan.', '2026-08-31 12:04:47.036'),
(61, 'finance.write', 'finance', 'Kelola Keuangan Bersama', 'Mencatat transaksi keuangan organisasi pada unit Shared yang diizinkan.', '2026-08-31 12:04:47.040'),
(62, 'finance.transfer', 'finance', 'Transfer Dana Internal', 'Melakukan transfer kas internal antar unit bisnis UNI-NEXUS secara terkontrol.', '2026-08-31 12:04:47.042'),
(63, 'finance.manage', 'finance', 'Administrasi Keuangan Terpadu', 'Mengelola konfigurasi keuangan global, treasury Shared, dan periode keuangan.', '2026-08-31 12:04:47.045'),
(64, 'master_data.read', 'master_data', 'Lihat Data Master', 'Melihat data referensi terpusat UNI-NEXUS sesuai workspace dan hak akses pengguna.', '2026-08-31 15:12:13.212'),
(65, 'master_data.manage', 'master_data', 'Kelola Data Master', 'Mengelola data referensi terpusat UNI-NEXUS dengan tetap mengikuti hak akses domain terkait.', '2026-08-31 15:12:13.239'),
(66, 'reports.read', 'reports', 'Lihat Pusat Laporan', 'Melihat katalog, preview, ringkasan, dan histori laporan yang dapat diakses melalui Pusat Laporan UNI-NEXUS.', '2026-08-31 16:47:52.072'),
(67, 'integrations.read', 'integrations', 'Lihat Pusat Integrasi', 'Melihat Pusat Integrasi Global, katalog provider, metadata koneksi, dan riwayat yang sudah disanitasi.', '2026-09-01 11:45:06.370'),
(68, 'integrations.manage', 'integrations', 'Kelola Integrasi', 'Membuat/mengubah/mengaktifkan/menonaktifkan koneksi integrasi dan memperbarui/menghapus kredensial.', '2026-09-01 11:45:06.370'),
(69, 'integrations.sync', 'integrations', 'Uji & Sinkronkan Integrasi', 'Menguji koneksi dan menjalankan sinkronisasi/aksi provider yang benar-benar didukung.', '2026-09-01 11:45:06.370');

-- --------------------------------------------------------

--
-- Table structure for table `printers`
--

CREATE TABLE `printers` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(150) NOT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `model` varchar(120) DEFAULT NULL,
  `serial_number` varchar(150) DEFAULT NULL,
  `printer_type` varchar(50) NOT NULL DEFAULT 'FDM' COMMENT 'FDM|SLA|SLS|other',
  `nozzle_diameter_mm` decimal(6,3) DEFAULT NULL,
  `build_volume_x_mm` decimal(10,2) DEFAULT NULL,
  `build_volume_y_mm` decimal(10,2) DEFAULT NULL,
  `build_volume_z_mm` decimal(10,2) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'available' COMMENT 'available|busy|maintenance|error|offline',
  `location_name` varchar(150) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_cost` decimal(18,2) DEFAULT NULL,
  `warranty_until` date DEFAULT NULL,
  `total_print_hours` decimal(14,2) NOT NULL DEFAULT '0.00',
  `notes` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `printer_issues`
--

CREATE TABLE `printer_issues` (
  `id` bigint UNSIGNED NOT NULL,
  `printer_id` bigint UNSIGNED NOT NULL,
  `issue_code` varchar(60) NOT NULL,
  `title` varchar(180) NOT NULL,
  `severity_code` varchar(30) NOT NULL DEFAULT 'medium' COMMENT 'low|medium|high|critical',
  `status_code` varchar(30) NOT NULL DEFAULT 'open' COMMENT 'open|investigating|resolved|closed',
  `description` text,
  `reported_by` bigint UNSIGNED DEFAULT NULL,
  `assigned_to` bigint UNSIGNED DEFAULT NULL,
  `reported_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolved_at` datetime(3) DEFAULT NULL,
  `resolution_notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `printer_maintenance_records`
--

CREATE TABLE `printer_maintenance_records` (
  `id` bigint UNSIGNED NOT NULL,
  `printer_id` bigint UNSIGNED NOT NULL,
  `schedule_id` bigint UNSIGNED DEFAULT NULL,
  `maintenance_type` varchar(100) NOT NULL,
  `performed_at` datetime(3) NOT NULL,
  `performed_by` bigint UNSIGNED DEFAULT NULL,
  `cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `print_hours_at_service` decimal(14,2) DEFAULT NULL,
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `printer_maintenance_schedules`
--

CREATE TABLE `printer_maintenance_schedules` (
  `id` bigint UNSIGNED NOT NULL,
  `printer_id` bigint UNSIGNED NOT NULL,
  `maintenance_type` varchar(100) NOT NULL,
  `trigger_type` varchar(30) NOT NULL COMMENT 'date|print_hours|job_count',
  `interval_value` decimal(12,2) DEFAULT NULL,
  `next_due_at` datetime(3) DEFAULT NULL,
  `next_due_print_hours` decimal(14,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `print_failures`
--

CREATE TABLE `print_failures` (
  `id` bigint UNSIGNED NOT NULL,
  `print_job_id` bigint UNSIGNED NOT NULL,
  `failure_type` varchar(50) NOT NULL COMMENT 'spaghetti|layer_shift|warping|adhesion|filament|power|human_error|other',
  `failure_stage` varchar(50) DEFAULT NULL,
  `description` text,
  `material_wasted_g` decimal(12,3) DEFAULT NULL,
  `estimated_loss` decimal(18,2) DEFAULT NULL,
  `requires_reprint` tinyint(1) NOT NULL DEFAULT '1',
  `reprint_job_id` bigint UNSIGNED DEFAULT NULL,
  `reported_by` bigint UNSIGNED DEFAULT NULL,
  `occurred_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `print_jobs`
--

CREATE TABLE `print_jobs` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `job_code` varchar(80) NOT NULL,
  `queue_item_id` bigint UNSIGNED DEFAULT NULL,
  `order_id` bigint UNSIGNED DEFAULT NULL,
  `order_item_id` bigint UNSIGNED DEFAULT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `variant_id` bigint UNSIGNED DEFAULT NULL,
  `printer_id` bigint UNSIGNED NOT NULL,
  `print_profile_id` bigint UNSIGNED DEFAULT NULL,
  `design_file_id` bigint UNSIGNED DEFAULT NULL,
  `job_name` varchar(200) NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `status_code` varchar(30) NOT NULL DEFAULT 'queued' COMMENT 'queued|ready|printing|paused|qc|completed|failed|cancelled',
  `queue_position` int UNSIGNED DEFAULT NULL,
  `estimated_print_minutes` int UNSIGNED DEFAULT NULL,
  `actual_print_minutes` int UNSIGNED DEFAULT NULL,
  `estimated_material_g` decimal(12,3) DEFAULT NULL,
  `actual_material_g` decimal(12,3) DEFAULT NULL,
  `estimated_cost` decimal(18,2) DEFAULT NULL,
  `actual_cost` decimal(18,2) DEFAULT NULL,
  `scheduled_start_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) DEFAULT NULL,
  `estimated_finish_at` datetime(3) DEFAULT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `progress_percent` decimal(6,2) NOT NULL DEFAULT '0.00',
  `operator_user_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `print_job_materials`
--

CREATE TABLE `print_job_materials` (
  `id` bigint UNSIGNED NOT NULL,
  `print_job_id` bigint UNSIGNED NOT NULL,
  `material_id` bigint UNSIGNED NOT NULL,
  `material_batch_id` bigint UNSIGNED DEFAULT NULL,
  `reservation_id` bigint UNSIGNED DEFAULT NULL,
  `planned_qty` decimal(18,4) DEFAULT NULL,
  `actual_qty` decimal(18,4) DEFAULT NULL,
  `unit_id` bigint UNSIGNED NOT NULL,
  `unit_cost` decimal(18,4) DEFAULT NULL,
  `actual_cost` decimal(18,2) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `print_job_status_history`
--

CREATE TABLE `print_job_status_history` (
  `id` bigint UNSIGNED NOT NULL,
  `print_job_id` bigint UNSIGNED NOT NULL,
  `from_status_code` varchar(30) DEFAULT NULL,
  `to_status_code` varchar(30) NOT NULL,
  `progress_percent` decimal(6,2) DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `changed_by` bigint UNSIGNED DEFAULT NULL,
  `changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `print_profiles`
--

CREATE TABLE `print_profiles` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `variant_id` bigint UNSIGNED DEFAULT NULL,
  `printer_id` bigint UNSIGNED DEFAULT NULL,
  `name` varchar(180) NOT NULL,
  `slicer_name` varchar(120) DEFAULT NULL,
  `nozzle_diameter_mm` decimal(6,3) DEFAULT NULL,
  `layer_height_mm` decimal(6,3) DEFAULT NULL,
  `infill_percent` decimal(6,2) DEFAULT NULL,
  `support_enabled` tinyint(1) DEFAULT NULL,
  `estimated_print_minutes` int UNSIGNED DEFAULT NULL,
  `estimated_material_qty` decimal(18,4) DEFAULT NULL,
  `estimated_material_unit_id` bigint UNSIGNED DEFAULT NULL,
  `settings_json` json DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_queue_items`
--

CREATE TABLE `production_queue_items` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `order_item_id` bigint UNSIGNED NOT NULL,
  `queue_position` int UNSIGNED NOT NULL,
  `priority_code` varchar(20) NOT NULL DEFAULT 'normal',
  `priority_score` decimal(10,3) NOT NULL DEFAULT '0.000',
  `scheduled_start_at` datetime(3) DEFAULT NULL,
  `scheduled_end_at` datetime(3) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'queued' COMMENT 'queued|scheduled|printing|completed|cancelled',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(500) DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `category_id` bigint UNSIGNED DEFAULT NULL,
  `sku` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` text,
  `product_type` varchar(30) NOT NULL DEFAULT 'premade' COMMENT 'premade|customizable|custom_service',
  `base_selling_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `estimated_cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `estimated_weight_g` decimal(12,3) DEFAULT NULL,
  `estimated_print_minutes` int UNSIGNED DEFAULT NULL,
  `default_margin_percent` decimal(8,3) DEFAULT NULL,
  `image_path` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_boms`
--

CREATE TABLE `product_boms` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `variant_id` bigint UNSIGNED DEFAULT NULL,
  `version_no` int UNSIGNED NOT NULL DEFAULT '1',
  `name` varchar(180) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_bom_items`
--

CREATE TABLE `product_bom_items` (
  `id` bigint UNSIGNED NOT NULL,
  `bom_id` bigint UNSIGNED NOT NULL,
  `material_id` bigint UNSIGNED NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint UNSIGNED NOT NULL,
  `waste_factor_percent` decimal(8,3) NOT NULL DEFAULT '0.000',
  `is_optional` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_categories`
--

CREATE TABLE `product_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(120) NOT NULL,
  `parent_id` bigint UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_variants`
--

CREATE TABLE `product_variants` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `sku` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `attributes` json DEFAULT NULL COMMENT 'color,size,material,etc',
  `selling_price` decimal(18,2) DEFAULT NULL,
  `estimated_cost` decimal(18,2) DEFAULT NULL,
  `estimated_weight_g` decimal(12,3) DEFAULT NULL,
  `estimated_print_minutes` int UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_deliverables`
--

CREATE TABLE `project_deliverables` (
  `id` bigint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NOT NULL,
  `milestone_id` bigint UNSIGNED DEFAULT NULL,
  `title` varchar(180) NOT NULL,
  `description` text,
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|submitted|revision|approved|delivered',
  `due_at` datetime(3) DEFAULT NULL,
  `delivered_at` datetime(3) DEFAULT NULL,
  `storage_path` varchar(500) DEFAULT NULL,
  `external_url` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_external_assignments`
--

CREATE TABLE `project_external_assignments` (
  `id` bigint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NOT NULL,
  `party_id` bigint UNSIGNED NOT NULL,
  `assignment_role` varchar(100) NOT NULL COMMENT 'vendor|freelancer|partner|talent|other',
  `scope_description` text,
  `agreed_fee` decimal(18,2) NOT NULL DEFAULT '0.00',
  `payment_status_code` varchar(30) NOT NULL DEFAULT 'unpaid',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_milestones`
--

CREATE TABLE `project_milestones` (
  `id` bigint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text,
  `due_at` datetime(3) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|in_progress|completed|late|cancelled',
  `sort_order` int NOT NULL DEFAULT '0',
  `completed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `po_number` varchar(80) NOT NULL,
  `supplier_party_id` bigint UNSIGNED NOT NULL,
  `purchase_request_id` bigint UNSIGNED DEFAULT NULL,
  `order_date` date NOT NULL,
  `expected_date` date DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'draft' COMMENT 'draft|sent|confirmed|partial|received|cancelled|closed',
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `shipping_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `notes` text,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_order_id` bigint UNSIGNED NOT NULL,
  `purchase_request_item_id` bigint UNSIGNED DEFAULT NULL,
  `material_id` bigint UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint UNSIGNED DEFAULT NULL,
  `unit_price` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `received_qty` decimal(18,4) NOT NULL DEFAULT '0.0000'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_requests`
--

CREATE TABLE `purchase_requests` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `request_code` varchar(80) NOT NULL,
  `requested_by` bigint UNSIGNED DEFAULT NULL,
  `requested_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `required_by` date DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'draft' COMMENT 'draft|submitted|approved|rejected|ordered|closed',
  `purpose` varchar(500) DEFAULT NULL,
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `approved_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_request_items`
--

CREATE TABLE `purchase_request_items` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_request_id` bigint UNSIGNED NOT NULL,
  `material_id` bigint UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint UNSIGNED DEFAULT NULL,
  `estimated_unit_cost` decimal(18,4) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `qc_inspections`
--

CREATE TABLE `qc_inspections` (
  `id` bigint UNSIGNED NOT NULL,
  `print_job_id` bigint UNSIGNED NOT NULL,
  `template_id` bigint UNSIGNED DEFAULT NULL,
  `inspector_user_id` bigint UNSIGNED DEFAULT NULL,
  `result_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|pass|fail|conditional',
  `notes` text,
  `inspected_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `qc_inspection_items`
--

CREATE TABLE `qc_inspection_items` (
  `id` bigint UNSIGNED NOT NULL,
  `inspection_id` bigint UNSIGNED NOT NULL,
  `template_item_id` bigint UNSIGNED DEFAULT NULL,
  `item_label` varchar(150) NOT NULL,
  `value_text` text,
  `passed` tinyint(1) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `qc_templates`
--

CREATE TABLE `qc_templates` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `qc_template_items`
--

CREATE TABLE `qc_template_items` (
  `id` bigint UNSIGNED NOT NULL,
  `template_id` bigint UNSIGNED NOT NULL,
  `item_code` varchar(60) NOT NULL,
  `label` varchar(150) NOT NULL,
  `check_type` varchar(30) NOT NULL DEFAULT 'boolean' COMMENT 'boolean|number|text|select',
  `required` tinyint(1) NOT NULL DEFAULT '1',
  `config_json` json DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quick_links`
--

CREATE TABLE `quick_links` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `label` varchar(120) NOT NULL,
  `url` varchar(500) NOT NULL,
  `icon_key` varchar(60) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quotations`
--

CREATE TABLE `quotations` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `quotation_number` varchar(80) NOT NULL,
  `party_id` bigint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED DEFAULT NULL,
  `order_id` bigint UNSIGNED DEFAULT NULL,
  `issue_date` date NOT NULL,
  `valid_until` date DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'draft' COMMENT 'draft|sent|accepted|rejected|expired|cancelled',
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `terms` text,
  `notes` text,
  `accepted_at` datetime(3) DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quotation_items`
--

CREATE TABLE `quotation_items` (
  `id` bigint UNSIGNED NOT NULL,
  `quotation_id` bigint UNSIGNED NOT NULL,
  `service_id` bigint UNSIGNED DEFAULT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `unit_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quotation_templates`
--

CREATE TABLE `quotation_templates` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `template_code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `title_template` varchar(220) DEFAULT NULL,
  `intro_text` text,
  `terms_text` text,
  `footer_text` text,
  `default_valid_days` int UNSIGNED NOT NULL DEFAULT '14',
  `config_json` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quotation_template_items`
--

CREATE TABLE `quotation_template_items` (
  `id` bigint UNSIGNED NOT NULL,
  `template_id` bigint UNSIGNED NOT NULL,
  `service_id` bigint UNSIGNED DEFAULT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `default_quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `default_unit_price` decimal(18,2) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_definitions`
--

CREATE TABLE `report_definitions` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `report_code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `report_type` varchar(60) NOT NULL,
  `config_json` json DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_exports`
--

CREATE TABLE `report_exports` (
  `id` bigint UNSIGNED NOT NULL,
  `report_definition_id` bigint UNSIGNED DEFAULT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `report_name` varchar(180) NOT NULL,
  `export_format` varchar(20) NOT NULL COMMENT 'pdf|xlsx|csv',
  `filter_json` json DEFAULT NULL,
  `storage_path` varchar(500) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'generated' COMMENT 'queued|generating|generated|failed',
  `generated_by` bigint UNSIGNED DEFAULT NULL,
  `generated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `scope_code` varchar(30) NOT NULL DEFAULT 'global' COMMENT 'global|craft|studio',
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `organization_id`, `code`, `name`, `description`, `scope_code`, `is_system`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'CEO', 'Chief Executive Officer', 'Peran eksekutif Chief Executive Officer UNI-NEXUS.', 'global', 1, 1, '2026-08-22 07:48:09.716', '2026-08-23 09:54:06.643'),
(2, 1, 'CTO', 'Chief Technology Officer', 'Administrator utama dan Chief Technology Officer UNI-NEXUS.', 'global', 1, 1, '2026-08-22 07:48:09.720', '2026-08-23 09:54:06.682'),
(3, 1, 'COO', 'Chief Operating Officer', 'Peran eksekutif Chief Operating Officer UNI-NEXUS.', 'global', 1, 1, '2026-08-22 07:48:09.722', '2026-08-23 09:54:06.663'),
(4, 1, 'FINANCE', 'Keuangan', 'Akses modul keuangan dan pelaporan.', 'global', 1, 0, '2026-08-22 07:48:09.725', '2026-08-23 09:54:06.803'),
(5, 1, 'CRAFT_OPERATOR', 'Operator Craft', 'Akses operasional Craft.', 'craft', 1, 0, '2026-08-22 07:48:09.727', '2026-08-23 09:54:06.803'),
(6, 1, 'STUDIO_STAFF', 'Staf Studio', 'Akses operasional Studio.', 'studio', 1, 0, '2026-08-22 07:48:09.730', '2026-08-23 09:54:06.803'),
(7, 1, 'SPECIALIST_STAFF', 'Staf Spesialis', 'Staf spesialis inti Uni-Inside yang mendukung operasional lintas Uni-Inside Craft dan Uni-Inside Studio.', 'global', 1, 1, '2026-08-23 09:54:06.704', '2026-08-28 09:29:48.334'),
(8, 1, 'ENGINEER_3D', 'Insinyur 3D', 'Insinyur 3D internal Uni-Inside.', 'global', 1, 1, '2026-08-23 09:54:06.731', '2026-08-23 09:54:06.731');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` bigint UNSIGNED NOT NULL,
  `permission_id` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES
(1, 1, '2026-08-22 07:48:09.737'),
(1, 2, '2026-08-22 07:48:09.737'),
(1, 3, '2026-08-22 07:48:09.737'),
(1, 4, '2026-08-22 07:48:09.737'),
(1, 5, '2026-08-22 07:48:09.737'),
(1, 6, '2026-08-22 07:48:09.737'),
(1, 7, '2026-08-22 07:48:09.737'),
(1, 8, '2026-08-22 07:48:09.737'),
(1, 9, '2026-08-22 07:48:09.737'),
(1, 10, '2026-08-22 07:48:09.737'),
(1, 11, '2026-08-22 07:48:09.737'),
(1, 12, '2026-08-22 07:48:09.737'),
(1, 13, '2026-08-22 07:48:09.737'),
(1, 14, '2026-08-22 07:48:09.737'),
(1, 15, '2026-08-22 07:48:09.737'),
(1, 16, '2026-08-22 07:48:09.737'),
(1, 17, '2026-08-22 07:48:09.737'),
(1, 18, '2026-08-22 07:48:09.737'),
(1, 19, '2026-08-22 07:48:09.737'),
(1, 20, '2026-08-22 07:48:09.737'),
(1, 21, '2026-08-22 07:48:09.737'),
(1, 22, '2026-08-22 07:48:09.737'),
(1, 23, '2026-08-22 07:48:09.737'),
(1, 24, '2026-08-22 07:48:09.737'),
(1, 25, '2026-08-22 07:48:09.737'),
(1, 26, '2026-08-26 15:19:36.805'),
(1, 27, '2026-08-26 15:19:36.805'),
(1, 28, '2026-08-26 19:57:36.549'),
(1, 29, '2026-08-26 19:57:36.549'),
(1, 30, '2026-08-27 09:20:17.164'),
(1, 31, '2026-08-27 09:20:17.164'),
(1, 32, '2026-08-27 10:25:39.332'),
(1, 33, '2026-08-27 10:25:39.332'),
(1, 34, '2026-08-27 10:25:39.332'),
(1, 35, '2026-08-27 11:21:01.831'),
(1, 36, '2026-08-27 11:21:01.831'),
(1, 37, '2026-08-27 11:21:01.831'),
(1, 38, '2026-08-27 15:54:03.507'),
(1, 39, '2026-08-27 15:54:03.507'),
(1, 40, '2026-08-27 16:45:45.265'),
(1, 41, '2026-08-27 16:45:45.265'),
(1, 42, '2026-08-27 21:12:06.005'),
(1, 43, '2026-08-27 21:12:06.005'),
(1, 44, '2026-08-27 22:32:07.179'),
(1, 45, '2026-08-27 22:32:07.179'),
(1, 46, '2026-08-28 00:24:01.379'),
(1, 47, '2026-08-28 00:24:01.379'),
(1, 48, '2026-08-28 05:18:26.079'),
(1, 49, '2026-08-28 05:18:26.079'),
(1, 50, '2026-08-28 05:18:26.079'),
(1, 51, '2026-08-31 09:05:42.718'),
(1, 52, '2026-08-31 09:05:42.718'),
(1, 53, '2026-08-31 09:05:42.721'),
(1, 54, '2026-08-31 10:00:11.948'),
(1, 55, '2026-08-31 10:00:11.948'),
(1, 56, '2026-08-31 10:00:11.951'),
(1, 57, '2026-08-31 10:00:11.948'),
(1, 58, '2026-08-31 10:00:11.948'),
(1, 59, '2026-08-31 10:00:11.951'),
(1, 60, '2026-08-31 12:04:47.049'),
(1, 61, '2026-08-31 12:04:47.049'),
(1, 62, '2026-08-31 12:04:47.049'),
(1, 63, '2026-08-31 12:04:47.049'),
(1, 64, '2026-08-31 15:12:13.264'),
(1, 65, '2026-08-31 15:12:13.289'),
(1, 66, '2026-08-31 16:47:52.106'),
(1, 67, '2026-09-01 11:50:34.113'),
(1, 68, '2026-09-01 11:50:34.113'),
(1, 69, '2026-09-01 11:50:34.113'),
(2, 1, '2026-08-22 07:48:09.737'),
(2, 2, '2026-08-22 07:48:09.737'),
(2, 3, '2026-08-22 07:48:09.737'),
(2, 4, '2026-08-22 07:48:09.737'),
(2, 5, '2026-08-22 07:48:09.737'),
(2, 6, '2026-08-22 07:48:09.737'),
(2, 7, '2026-08-22 07:48:09.737'),
(2, 8, '2026-08-22 07:48:09.737'),
(2, 9, '2026-08-22 07:48:09.737'),
(2, 10, '2026-08-22 07:48:09.737'),
(2, 11, '2026-08-22 07:48:09.737'),
(2, 12, '2026-08-22 07:48:09.737'),
(2, 13, '2026-08-22 07:48:09.737'),
(2, 14, '2026-08-22 07:48:09.737'),
(2, 15, '2026-08-22 07:48:09.737'),
(2, 16, '2026-08-22 07:48:09.737'),
(2, 17, '2026-08-22 07:48:09.737'),
(2, 18, '2026-08-22 07:48:09.737'),
(2, 19, '2026-08-22 07:48:09.737'),
(2, 20, '2026-08-22 07:48:09.737'),
(2, 21, '2026-08-22 07:48:09.737'),
(2, 22, '2026-08-22 07:48:09.737'),
(2, 23, '2026-08-22 07:48:09.737'),
(2, 24, '2026-08-22 07:48:09.737'),
(2, 25, '2026-08-22 07:48:09.737'),
(2, 26, '2026-08-26 15:19:36.805'),
(2, 27, '2026-08-26 15:19:36.805'),
(2, 28, '2026-08-26 19:57:36.549'),
(2, 29, '2026-08-26 19:57:36.549'),
(2, 30, '2026-08-27 09:20:17.164'),
(2, 31, '2026-08-27 09:20:17.164'),
(2, 32, '2026-08-27 10:25:39.332'),
(2, 33, '2026-08-27 10:25:39.332'),
(2, 34, '2026-08-27 10:25:39.332'),
(2, 35, '2026-08-27 11:21:01.831'),
(2, 36, '2026-08-27 11:21:01.831'),
(2, 37, '2026-08-27 11:21:01.831'),
(2, 38, '2026-08-27 15:54:03.507'),
(2, 39, '2026-08-27 15:54:03.507'),
(2, 40, '2026-08-27 16:45:45.265'),
(2, 41, '2026-08-27 16:45:45.265'),
(2, 42, '2026-08-27 21:12:06.005'),
(2, 43, '2026-08-27 21:12:06.005'),
(2, 44, '2026-08-27 22:32:07.179'),
(2, 45, '2026-08-27 22:32:07.179'),
(2, 46, '2026-08-28 00:24:01.379'),
(2, 47, '2026-08-28 00:24:01.379'),
(2, 48, '2026-08-28 05:18:26.079'),
(2, 49, '2026-08-28 05:18:26.079'),
(2, 50, '2026-08-28 05:18:26.079'),
(2, 51, '2026-08-31 09:05:42.718'),
(2, 52, '2026-08-31 09:05:42.718'),
(2, 53, '2026-08-31 09:05:42.721'),
(2, 54, '2026-08-31 10:00:11.948'),
(2, 55, '2026-08-31 10:00:11.948'),
(2, 56, '2026-08-31 10:00:11.951'),
(2, 57, '2026-08-31 10:00:11.948'),
(2, 58, '2026-08-31 10:00:11.948'),
(2, 59, '2026-08-31 10:00:11.951'),
(2, 60, '2026-08-31 12:04:47.049'),
(2, 61, '2026-08-31 12:04:47.049'),
(2, 62, '2026-08-31 12:04:47.049'),
(2, 63, '2026-08-31 12:04:47.049'),
(2, 64, '2026-08-31 15:12:13.264'),
(2, 65, '2026-08-31 15:12:13.289'),
(2, 66, '2026-08-31 16:47:52.106'),
(2, 67, '2026-09-01 11:50:34.113'),
(2, 68, '2026-09-01 11:50:34.113'),
(2, 69, '2026-09-01 11:50:34.113'),
(3, 1, '2026-08-23 09:54:06.853'),
(3, 2, '2026-08-23 09:54:06.853'),
(3, 3, '2026-08-23 09:54:06.853'),
(3, 4, '2026-08-23 09:54:06.853'),
(3, 5, '2026-08-23 09:54:06.853'),
(3, 6, '2026-08-23 09:54:06.853'),
(3, 7, '2026-08-23 09:54:06.853'),
(3, 8, '2026-08-23 09:54:06.853'),
(3, 9, '2026-08-23 09:54:06.853'),
(3, 10, '2026-08-23 09:54:06.853'),
(3, 11, '2026-08-23 09:54:06.853'),
(3, 12, '2026-08-23 09:54:06.853'),
(3, 13, '2026-08-23 09:54:06.853'),
(3, 14, '2026-08-23 09:54:06.853'),
(3, 15, '2026-08-23 09:54:06.853'),
(3, 16, '2026-08-23 09:54:06.853'),
(3, 17, '2026-08-23 09:54:06.853'),
(3, 18, '2026-08-23 09:54:06.853'),
(3, 19, '2026-08-23 09:54:06.853'),
(3, 20, '2026-08-23 09:54:06.853'),
(3, 21, '2026-08-23 09:54:06.853'),
(3, 22, '2026-08-23 09:54:06.903'),
(3, 23, '2026-08-23 09:54:06.853'),
(3, 24, '2026-08-23 09:54:06.853'),
(3, 25, '2026-08-23 09:54:06.853'),
(3, 26, '2026-08-26 15:19:36.805'),
(3, 27, '2026-08-26 15:19:36.805'),
(3, 28, '2026-08-26 19:57:36.549'),
(3, 29, '2026-08-26 19:57:36.549'),
(3, 30, '2026-08-27 09:20:17.164'),
(3, 31, '2026-08-27 09:20:17.164'),
(3, 32, '2026-08-27 10:25:39.332'),
(3, 33, '2026-08-27 10:25:39.332'),
(3, 34, '2026-08-27 10:25:39.332'),
(3, 35, '2026-08-27 11:21:01.831'),
(3, 36, '2026-08-27 11:21:01.831'),
(3, 37, '2026-08-27 11:21:01.831'),
(3, 38, '2026-08-27 15:54:03.507'),
(3, 39, '2026-08-27 15:54:03.507'),
(3, 40, '2026-08-27 16:45:45.265'),
(3, 41, '2026-08-27 16:45:45.265'),
(3, 42, '2026-08-27 21:12:06.005'),
(3, 43, '2026-08-27 21:12:06.005'),
(3, 44, '2026-08-27 22:32:07.179'),
(3, 45, '2026-08-27 22:32:07.179'),
(3, 46, '2026-08-28 00:24:01.379'),
(3, 47, '2026-08-28 00:24:01.379'),
(3, 48, '2026-08-28 05:18:26.079'),
(3, 49, '2026-08-28 05:18:26.079'),
(3, 50, '2026-08-28 05:18:26.079'),
(3, 51, '2026-08-31 09:05:42.718'),
(3, 52, '2026-08-31 09:05:42.718'),
(3, 53, '2026-08-31 09:05:42.721'),
(3, 54, '2026-08-31 10:00:11.948'),
(3, 55, '2026-08-31 10:00:11.948'),
(3, 56, '2026-08-31 10:00:11.951'),
(3, 57, '2026-08-31 10:00:11.948'),
(3, 58, '2026-08-31 10:00:11.948'),
(3, 59, '2026-08-31 10:00:11.951'),
(3, 60, '2026-08-31 12:04:47.049'),
(3, 61, '2026-08-31 12:04:47.049'),
(3, 62, '2026-08-31 12:04:47.049'),
(3, 63, '2026-08-31 12:04:47.049'),
(3, 64, '2026-08-31 15:12:13.264'),
(3, 65, '2026-08-31 15:12:13.289'),
(3, 66, '2026-08-31 16:47:52.106'),
(3, 67, '2026-09-01 11:50:34.113'),
(3, 68, '2026-09-01 11:50:34.113'),
(3, 69, '2026-09-01 11:50:34.113'),
(4, 12, '2026-08-31 12:04:47.054'),
(4, 13, '2026-08-31 12:04:47.054'),
(4, 18, '2026-08-31 12:04:47.054'),
(4, 19, '2026-08-31 12:04:47.054'),
(4, 46, '2026-08-28 00:24:01.379'),
(4, 47, '2026-08-28 00:24:01.379'),
(4, 51, '2026-08-31 09:05:42.718'),
(4, 52, '2026-08-31 09:05:42.718'),
(4, 54, '2026-08-31 10:00:11.948'),
(4, 55, '2026-08-31 10:00:11.948'),
(4, 57, '2026-08-31 10:00:11.948'),
(4, 58, '2026-08-31 10:00:11.948'),
(4, 60, '2026-08-31 12:04:47.049'),
(4, 61, '2026-08-31 12:04:47.049'),
(4, 62, '2026-08-31 12:04:47.049'),
(4, 63, '2026-08-31 12:04:47.049'),
(5, 51, '2026-08-31 09:05:42.718'),
(5, 52, '2026-08-31 09:05:42.718'),
(5, 54, '2026-08-31 10:00:11.948'),
(5, 55, '2026-08-31 10:00:11.948'),
(5, 57, '2026-08-31 10:00:11.948'),
(5, 58, '2026-08-31 10:00:11.948'),
(6, 38, '2026-08-27 15:54:03.507'),
(6, 39, '2026-08-27 15:54:03.507'),
(6, 40, '2026-08-27 16:45:45.265'),
(6, 41, '2026-08-27 16:45:45.265'),
(6, 42, '2026-08-27 21:12:06.005'),
(6, 43, '2026-08-27 21:12:06.005'),
(6, 44, '2026-08-27 22:32:07.179'),
(6, 45, '2026-08-27 22:32:07.179'),
(6, 48, '2026-08-28 05:18:26.105'),
(6, 51, '2026-08-31 09:05:42.718'),
(6, 52, '2026-08-31 09:05:42.718'),
(6, 54, '2026-08-31 10:00:11.948'),
(6, 55, '2026-08-31 10:00:11.948'),
(6, 57, '2026-08-31 10:00:11.948'),
(6, 58, '2026-08-31 10:00:11.948'),
(7, 1, '2026-08-23 09:54:06.853'),
(7, 2, '2026-08-23 09:54:06.853'),
(7, 3, '2026-08-23 09:54:06.853'),
(7, 4, '2026-08-23 09:54:06.853'),
(7, 5, '2026-08-23 09:54:06.853'),
(7, 6, '2026-08-23 09:54:06.853'),
(7, 7, '2026-08-23 09:54:06.853'),
(7, 8, '2026-08-23 09:54:06.853'),
(7, 9, '2026-08-23 09:54:06.853'),
(7, 10, '2026-08-23 09:54:06.853'),
(7, 11, '2026-08-23 09:54:06.853'),
(7, 12, '2026-08-23 09:54:06.853'),
(7, 13, '2026-08-23 09:54:06.853'),
(7, 14, '2026-08-23 09:54:06.853'),
(7, 15, '2026-08-23 09:54:06.853'),
(7, 16, '2026-08-23 09:54:06.853'),
(7, 17, '2026-08-23 09:54:06.853'),
(7, 18, '2026-08-23 09:54:06.853'),
(7, 19, '2026-08-23 09:54:06.853'),
(7, 20, '2026-08-23 09:54:06.853'),
(7, 21, '2026-08-23 09:54:06.853'),
(7, 23, '2026-08-23 09:54:06.853'),
(7, 24, '2026-08-23 09:54:06.853'),
(7, 25, '2026-08-23 09:54:06.853'),
(7, 26, '2026-08-26 15:19:36.805'),
(7, 27, '2026-08-26 15:19:36.805'),
(7, 28, '2026-08-26 19:57:36.549'),
(7, 29, '2026-08-26 19:57:36.549'),
(7, 30, '2026-08-27 09:20:17.164'),
(7, 31, '2026-08-27 09:20:17.164'),
(7, 32, '2026-08-27 10:25:39.332'),
(7, 33, '2026-08-27 10:25:39.332'),
(7, 34, '2026-08-27 10:25:39.332'),
(7, 35, '2026-08-27 11:21:01.831'),
(7, 36, '2026-08-27 11:21:01.831'),
(7, 37, '2026-08-27 11:21:01.831'),
(7, 40, '2026-08-27 16:45:45.265'),
(7, 41, '2026-08-27 16:45:45.265'),
(7, 51, '2026-08-31 09:05:42.718'),
(7, 52, '2026-08-31 09:05:42.718'),
(7, 54, '2026-08-31 10:00:11.948'),
(7, 55, '2026-08-31 10:00:11.948'),
(7, 57, '2026-08-31 10:00:11.948'),
(7, 58, '2026-08-31 10:00:11.948'),
(7, 64, '2026-08-31 15:12:13.264'),
(7, 66, '2026-08-31 16:47:52.106'),
(7, 67, '2026-09-01 11:50:34.113'),
(7, 68, '2026-09-01 11:50:34.113'),
(7, 69, '2026-09-01 11:50:34.113'),
(8, 1, '2026-08-23 09:54:06.853'),
(8, 2, '2026-08-23 09:54:06.853'),
(8, 3, '2026-08-23 09:54:06.853'),
(8, 4, '2026-08-23 09:54:06.853'),
(8, 5, '2026-08-23 09:54:06.853'),
(8, 6, '2026-08-23 09:54:06.853'),
(8, 7, '2026-08-23 09:54:06.853'),
(8, 8, '2026-08-23 09:54:06.853'),
(8, 9, '2026-08-23 09:54:06.853'),
(8, 10, '2026-08-23 09:54:06.853'),
(8, 11, '2026-08-23 09:54:06.853'),
(8, 12, '2026-08-23 09:54:06.853'),
(8, 13, '2026-08-23 09:54:06.853'),
(8, 14, '2026-08-23 09:54:06.853'),
(8, 15, '2026-08-23 09:54:06.853'),
(8, 16, '2026-08-23 09:54:06.853'),
(8, 17, '2026-08-23 09:54:06.853'),
(8, 18, '2026-08-23 09:54:06.853'),
(8, 19, '2026-08-23 09:54:06.853'),
(8, 20, '2026-08-23 09:54:06.853'),
(8, 21, '2026-08-23 09:54:06.853'),
(8, 23, '2026-08-23 09:54:06.853'),
(8, 24, '2026-08-23 09:54:06.853'),
(8, 25, '2026-08-23 09:54:06.853'),
(8, 26, '2026-08-26 15:19:36.805'),
(8, 27, '2026-08-26 15:19:36.805'),
(8, 28, '2026-08-26 19:57:36.549'),
(8, 29, '2026-08-26 19:57:36.549'),
(8, 30, '2026-08-27 09:20:17.164'),
(8, 31, '2026-08-27 09:20:17.164'),
(8, 32, '2026-08-27 10:25:39.332'),
(8, 33, '2026-08-27 10:25:39.332'),
(8, 34, '2026-08-27 10:25:39.332'),
(8, 35, '2026-08-27 11:21:01.831'),
(8, 36, '2026-08-27 11:21:01.831'),
(8, 37, '2026-08-27 11:21:01.831'),
(8, 51, '2026-08-31 09:05:42.718'),
(8, 52, '2026-08-31 09:05:42.718'),
(8, 54, '2026-08-31 10:00:11.948'),
(8, 55, '2026-08-31 10:00:11.948'),
(8, 57, '2026-08-31 10:00:11.948'),
(8, 58, '2026-08-31 10:00:11.948'),
(8, 64, '2026-08-31 15:12:13.264'),
(8, 66, '2026-08-31 16:47:52.106'),
(8, 67, '2026-09-01 11:50:34.113'),
(8, 68, '2026-09-01 11:50:34.113'),
(8, 69, '2026-09-01 11:50:34.113');

-- --------------------------------------------------------

--
-- Table structure for table `sales_channels`
--

CREATE TABLE `sales_channels` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `channel_type` varchar(30) NOT NULL COMMENT 'marketplace|direct|partner|internal',
  `external_url` varchar(500) DEFAULT NULL,
  `is_integrated` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_packages`
--

CREATE TABLE `service_packages` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` text,
  `package_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_package_items`
--

CREATE TABLE `service_package_items` (
  `id` bigint UNSIGNED NOT NULL,
  `package_id` bigint UNSIGNED NOT NULL,
  `service_id` bigint UNSIGNED NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_reservations`
--

CREATE TABLE `stock_reservations` (
  `id` bigint UNSIGNED NOT NULL,
  `material_id` bigint UNSIGNED NOT NULL,
  `material_batch_id` bigint UNSIGNED DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint UNSIGNED NOT NULL,
  `reference_type` varchar(60) NOT NULL COMMENT 'craft_order|order_item|production_queue|print_job',
  `reference_id` bigint UNSIGNED NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'reserved' COMMENT 'reserved|consumed|released|cancelled',
  `reserved_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` datetime(3) DEFAULT NULL,
  `released_at` datetime(3) DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `studio_projects`
--

CREATE TABLE `studio_projects` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `project_code` varchar(80) NOT NULL,
  `client_party_id` bigint UNSIGNED NOT NULL,
  `project_name` varchar(220) NOT NULL,
  `project_type` varchar(100) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'lead' COMMENT 'lead|quotation|approved|in_progress|review|completed|paid|cancelled',
  `priority_code` varchar(20) NOT NULL DEFAULT 'normal',
  `start_date` date DEFAULT NULL,
  `deadline_at` datetime(3) DEFAULT NULL,
  `completed_at` datetime(3) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `contract_value` decimal(18,2) NOT NULL DEFAULT '0.00',
  `estimated_cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `actual_cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `payment_status_code` varchar(30) NOT NULL DEFAULT 'unpaid',
  `brief` text,
  `notes` text,
  `project_manager_user_id` bigint UNSIGNED DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `studio_project_members`
--

CREATE TABLE `studio_project_members` (
  `project_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `role_label` varchar(100) DEFAULT NULL,
  `allocation_percent` decimal(6,2) DEFAULT NULL,
  `joined_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `left_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `studio_project_services`
--

CREATE TABLE `studio_project_services` (
  `id` bigint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NOT NULL,
  `service_id` bigint UNSIGNED DEFAULT NULL,
  `package_id` bigint UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `unit_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `studio_project_status_history`
--

CREATE TABLE `studio_project_status_history` (
  `id` bigint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NOT NULL,
  `from_status_code` varchar(30) DEFAULT NULL,
  `to_status_code` varchar(30) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `changed_by` bigint UNSIGNED DEFAULT NULL,
  `changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `studio_services`
--

CREATE TABLE `studio_services` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `category_id` bigint UNSIGNED DEFAULT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` text,
  `pricing_model` varchar(30) NOT NULL DEFAULT 'fixed' COMMENT 'fixed|hourly|daily|package|custom',
  `base_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `unit_label` varchar(60) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `studio_service_categories`
--

CREATE TABLE `studio_service_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(120) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_invoices`
--

CREATE TABLE `supplier_invoices` (
  `id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `supplier_party_id` bigint UNSIGNED NOT NULL,
  `purchase_order_id` bigint UNSIGNED DEFAULT NULL,
  `supplier_invoice_number` varchar(120) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'unpaid' COMMENT 'unpaid|partial|paid|overdue|void',
  `total_amount` decimal(18,2) NOT NULL,
  `paid_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `balance_due` decimal(18,2) NOT NULL DEFAULT '0.00',
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `document_path` varchar(500) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `scope_business_unit_id` bigint UNSIGNED GENERATED ALWAYS AS (coalesce(`business_unit_id`,0)) STORED,
  `setting_group` varchar(80) NOT NULL,
  `setting_key` varchar(120) NOT NULL,
  `setting_value` json DEFAULT NULL,
  `is_secret` tinyint(1) NOT NULL DEFAULT '0',
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `organization_id`, `business_unit_id`, `setting_group`, `setting_key`, `setting_value`, `is_secret`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'general', 'week_start', '\"monday\"', 0, 2, '2026-09-10 01:30:14.105', '2026-09-10 01:30:16.606'),
(3, 1, NULL, 'documents', 'pdf_footer_text', '\"Uni-Inside Studio, all rights reserved\"', 0, 2, '2026-09-10 01:31:46.698', '2026-09-10 01:31:46.698'),
(4, 1, NULL, 'documents', 'show_organization_contact', 'true', 0, 2, '2026-09-10 01:31:46.698', '2026-09-10 01:31:46.698'),
(5, 1, NULL, 'documents', 'show_organization_logo', 'true', 0, 2, '2026-09-10 01:31:46.700', '2026-09-10 01:31:46.700'),
(6, 1, 1, 'notifications', 'order_deadline_warning_hours', '21', 0, 2, '2026-09-10 01:31:52.088', '2026-09-10 01:31:52.088');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `task_code` varchar(80) DEFAULT NULL,
  `title` varchar(220) NOT NULL,
  `description` text,
  `status_code` varchar(30) NOT NULL DEFAULT 'todo' COMMENT 'todo|in_progress|blocked|done|cancelled',
  `priority_code` varchar(20) NOT NULL DEFAULT 'normal',
  `start_at` datetime(3) DEFAULT NULL,
  `due_at` datetime(3) DEFAULT NULL,
  `reminder_minutes_before` int UNSIGNED DEFAULT NULL,
  `source_module_code` varchar(80) DEFAULT NULL,
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint UNSIGNED DEFAULT NULL,
  `source_code` varchar(120) DEFAULT NULL,
  `source_key` varchar(190) DEFAULT NULL COMMENT 'Deterministic idempotency key for generated tasks',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `completed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_assignees`
--

CREATE TABLE `task_assignees` (
  `task_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `assigned_by` bigint UNSIGNED DEFAULT NULL,
  `assigned_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transaction_categories`
--

CREATE TABLE `transaction_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `transaction_type` varchar(30) NOT NULL COMMENT 'income|expense|transfer|adjustment',
  `default_coa_account_id` bigint UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `treasury_accounts`
--

CREATE TABLE `treasury_accounts` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL,
  `coa_account_id` bigint UNSIGNED DEFAULT NULL,
  `account_code` varchar(60) NOT NULL,
  `name` varchar(150) NOT NULL,
  `account_type` varchar(30) NOT NULL COMMENT 'cash|bank|ewallet|marketplace_balance',
  `provider_name` varchar(120) DEFAULT NULL,
  `account_number_masked` varchar(100) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `opening_balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `current_balance` decimal(18,2) NOT NULL DEFAULT '0.00' COMMENT 'Cache; backend updates atomically',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `units_of_measure`
--

CREATE TABLE `units_of_measure` (
  `id` bigint UNSIGNED NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(60) NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `unit_group` varchar(30) NOT NULL COMMENT 'weight|count|length|volume|time|other',
  `decimal_places` tinyint UNSIGNED NOT NULL DEFAULT '2',
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `employee_code` varchar(50) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `avatar_path` varchar(500) DEFAULT NULL,
  `profile_banner_path` varchar(500) DEFAULT NULL,
  `profile_status_code` varchar(30) NOT NULL DEFAULT 'default' COMMENT 'default|busy|sick|leave',
  `status_code` varchar(30) NOT NULL DEFAULT 'inactive' COMMENT 'active|inactive|suspended',
  `approval_status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|approved|rejected',
  `registration_source` varchar(30) NOT NULL DEFAULT 'self_signup' COMMENT 'self_signup|admin_created|bootstrap|legacy|reactivation',
  `approval_requested_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `approved_at` datetime(3) DEFAULT NULL,
  `rejected_by` bigint UNSIGNED DEFAULT NULL,
  `rejected_at` datetime(3) DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `default_workspace_code` varchar(30) NOT NULL DEFAULT 'craft' COMMENT 'craft|studio',
  `email_verified_at` datetime(3) DEFAULT NULL,
  `last_login_at` datetime(3) DEFAULT NULL,
  `password_changed_at` datetime(3) DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `organization_id`, `employee_code`, `full_name`, `username`, `email`, `password_hash`, `phone`, `avatar_path`, `profile_banner_path`, `profile_status_code`, `status_code`, `approval_status_code`, `registration_source`, `approval_requested_at`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`, `default_workspace_code`, `email_verified_at`, `last_login_at`, `password_changed_at`, `must_change_password`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, NULL, 'Jane Doe', 'janedoe', 'jane@example.com', '$2b$10$Vi0qAbt2L/TLkN4fmHH.6.IRpR16bcOmjqE/8aiNW5HnSCAfqKakK', NULL, NULL, NULL, 'default', 'inactive', 'approved', 'legacy', '2026-08-22 15:30:29.057', NULL, '2026-08-22 15:30:29.057', NULL, NULL, NULL, 'craft', NULL, '2026-08-22 15:32:10.679', NULL, 0, '2026-08-22 15:30:29.057', '2026-08-23 09:54:23.987', '2026-08-23 09:54:23.987'),
(2, 1, NULL, 'Muhammad Taqi Izdiharr', 'taqizdihar', 'm.taqizdihar@gmail.com', '$2b$10$YIul.Py5PQD6TlV66bwZJe0wndWTdHwQdmedGkGyp1dFdJgub2OaG', NULL, 'avatars/5790144f-d090-4ee4-9097-ae12394dc907.webp', 'profile-banners/f5c129e7-4637-46bc-83eb-c2d7c68aca56.jpg', 'default', 'active', 'approved', 'bootstrap', '2026-08-23 10:07:06.542', NULL, '2026-08-23 10:07:06.542', NULL, NULL, NULL, 'craft', NULL, '2026-09-10 08:09:44.388', '2026-09-09 14:23:58.828', 0, '2026-08-23 10:07:06.542', '2026-09-10 08:09:44.388', NULL),
(3, 1, NULL, 'April Adzania', 'apriladzania', 'april.adzania@gmail.com', '$2b$10$RBpHzttXQPDNvppR6Xgq6ehLMxyYZ2f4GNiGNIIDZeXXN8OajzZXe', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:14:08.000', 2, '2026-08-23 10:50:09.750', NULL, NULL, NULL, 'craft', NULL, '2026-09-09 09:04:13.793', NULL, 0, '2026-08-23 10:14:08.000', '2026-09-09 09:04:13.793', NULL),
(4, 1, NULL, 'Dian Daeli', 'diandaeli', 'diandaeli125@gmail.com', '$2b$10$XabxUPPEFMYg4wZXR.zEIu37A9xnaMwT/g1oMY4UQxU42G0a2Lpx2', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:14:40.763', 2, '2026-08-23 10:50:05.934', NULL, NULL, NULL, 'craft', NULL, '2026-09-09 09:03:10.835', NULL, 0, '2026-08-23 10:14:40.763', '2026-09-09 09:03:10.835', NULL),
(5, 1, NULL, 'Naura Ramadhani', 'nauraramadhani', 'nauraramadhani.nr32@gmail.com', '$2b$10$RLbe7PCKBRA535LsSCKJOuKbDN55MqfItEI1lN8eJtXApHUwU5v02', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:16:56.533', 2, '2026-08-23 10:50:00.349', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:16:56.533', '2026-08-23 10:50:00.349', NULL),
(6, 1, NULL, 'Amadea Salsabila', 'amadeasalsabila', 'rilldmnti@gmail.com', '$2b$10$3iUttKFVotoqazxXHSJvfeB3g4zAgQ85KaqjUi6kJsD7oGyz/hdSK', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:17:33.382', 2, '2026-08-23 10:49:54.447', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:17:33.382', '2026-08-23 10:49:54.447', NULL),
(7, 1, NULL, 'Cantika Anggi', 'cantikaanggi', 'cantikaanggianggraheni@gmail.com', '$2b$10$RB6gn.zNfGvtYdSuVOEIpuBziKzZ6DaOT1/g0IJZXaFI1yQYT4NPu', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:18:10.986', 2, '2026-08-23 10:49:50.871', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:18:10.986', '2026-08-23 10:49:50.871', NULL),
(8, 1, NULL, 'Siti Amany Fakhirah Riby', 'sitiamanyfakhirahriby', 'amanyfrss@gmail.com', '$2b$10$DInVMuTao6S.gXLHN1LDOesJsPICEsMBqaHg05T8in7xUYXOsW35O', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:19:35.785', 2, '2026-08-23 10:49:46.824', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:19:35.785', '2026-08-23 10:49:46.824', NULL),
(9, 1, NULL, 'Ahmad Ropaldo', 'ahmadropaldo', 'ahmadropaldo@gmail.com', '$2b$10$JBBoBb3h1j5idkGu0u.lSunIXGwWoLAmiPD7GzA18yEK5BAopsWOG', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:20:05.570', 2, '2026-08-23 10:49:42.815', NULL, NULL, NULL, 'craft', NULL, '2026-09-09 09:04:26.007', NULL, 0, '2026-08-23 10:20:05.570', '2026-09-09 09:04:26.007', NULL),
(10, 1, NULL, 'Nadine Nathania Pelleng', 'nadinenathaniapelleng', 'nathaniapelleng15@gmail.com', '$2b$10$3PbnHpPuPG2Y.kt/TLzMLuH7ZbjA3VPM5lg4obU/yIqnxIVkO1CuC', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:20:42.456', 2, '2026-08-23 10:49:37.870', NULL, NULL, NULL, 'craft', NULL, '2026-08-28 08:39:38.944', NULL, 0, '2026-08-23 10:20:42.456', '2026-08-28 08:39:38.944', NULL),
(394, 1, NULL, 'QA User-1', 'qauser1', 'qa1@gmail.com', '$2b$10$NU3i7TVqFSmOU1M4XR6LfuQlQRUNV6Dh/8mZio/DoABoGZ7X5Kp8i', '081316556900', NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-09-09 08:42:55.401', 2, '2026-09-09 09:10:58.474', NULL, NULL, NULL, 'studio', NULL, '2026-09-09 13:19:37.400', NULL, 0, '2026-09-09 08:42:55.401', '2026-09-09 13:19:37.400', NULL),
(395, 1, NULL, 'QA User 2', 'qa2', 'qa2@gmail.com', '$2b$10$Sp0X860yRubgvIvuMpXJdO58cD31H/cVMa4p20.4nK.H1PgOZBnza', NULL, NULL, NULL, 'default', 'inactive', 'rejected', 'self_signup', '2026-09-09 09:52:41.128', NULL, NULL, 2, '2026-09-09 09:59:44.933', 'Tolong gunakan kredensial yang benar.', 'craft', NULL, NULL, NULL, 0, '2026-09-09 09:52:41.128', '2026-09-09 14:28:57.317', '2026-09-09 14:28:57.317');

-- --------------------------------------------------------

--
-- Table structure for table `user_business_units`
--

CREATE TABLE `user_business_units` (
  `user_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED NOT NULL,
  `can_access` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_business_units`
--

INSERT INTO `user_business_units` (`user_id`, `business_unit_id`, `can_access`, `created_at`) VALUES
(2, 1, 1, '2026-08-23 10:07:06.555'),
(2, 2, 1, '2026-08-23 10:07:06.557'),
(2, 3, 1, '2026-08-23 10:07:06.558'),
(3, 1, 1, '2026-08-23 10:50:09.752'),
(3, 2, 1, '2026-08-23 10:50:09.753'),
(3, 3, 1, '2026-08-23 10:50:09.753'),
(4, 1, 1, '2026-08-23 10:50:05.937'),
(4, 2, 1, '2026-08-23 10:50:05.938'),
(4, 3, 1, '2026-08-23 10:50:05.938'),
(5, 1, 1, '2026-08-23 10:50:00.351'),
(5, 2, 1, '2026-08-23 10:50:00.351'),
(5, 3, 1, '2026-08-23 10:50:00.351'),
(6, 1, 1, '2026-08-23 10:49:54.449'),
(6, 2, 1, '2026-08-23 10:49:54.450'),
(6, 3, 1, '2026-08-23 10:49:54.450'),
(7, 1, 1, '2026-08-23 10:49:50.873'),
(7, 2, 1, '2026-08-23 10:49:50.873'),
(7, 3, 1, '2026-08-23 10:49:50.874'),
(8, 1, 1, '2026-08-23 10:49:46.826'),
(8, 2, 1, '2026-08-23 10:49:46.827'),
(8, 3, 1, '2026-08-23 10:49:46.827'),
(9, 1, 1, '2026-08-23 10:49:42.819'),
(9, 2, 1, '2026-08-23 10:49:42.819'),
(9, 3, 1, '2026-08-23 10:49:42.820'),
(10, 1, 1, '2026-08-23 10:49:37.875'),
(10, 2, 1, '2026-08-23 10:49:37.876'),
(10, 3, 1, '2026-08-23 10:49:37.876'),
(394, 1, 1, '2026-09-09 09:10:58.471'),
(394, 2, 1, '2026-09-09 09:10:58.472'),
(394, 3, 1, '2026-09-09 09:10:58.473');

-- --------------------------------------------------------

--
-- Table structure for table `user_deletion_requests`
--

CREATE TABLE `user_deletion_requests` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|revoked|approved|rejected',
  `request_reason` varchar(500) DEFAULT NULL,
  `requested_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revoked_at` datetime(3) DEFAULT NULL,
  `reviewed_by` bigint UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime(3) DEFAULT NULL,
  `review_note` varchar(500) DEFAULT NULL,
  `pending_user_id` bigint UNSIGNED GENERATED ALWAYS AS ((case when (`status_code` = _utf8mb4'pending') then `user_id` else NULL end)) STORED,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_deletion_requests`
--

INSERT INTO `user_deletion_requests` (`id`, `organization_id`, `user_id`, `status_code`, `request_reason`, `requested_at`, `revoked_at`, `reviewed_by`, `reviewed_at`, `review_note`, `created_at`, `updated_at`) VALUES
(1, 1, 394, 'revoked', 'Saya ingin mengundurkan diri.', '2026-09-09 14:27:12.507', '2026-09-09 14:27:19.091', NULL, NULL, NULL, '2026-09-09 14:27:12.507', '2026-09-09 14:27:19.091'),
(2, 1, 394, 'revoked', 'Izin mengundurkan diri.', '2026-09-09 14:27:43.474', '2026-09-09 14:28:34.250', NULL, NULL, NULL, '2026-09-09 14:27:43.474', '2026-09-09 14:28:34.250');

-- --------------------------------------------------------

--
-- Table structure for table `user_presence_sessions`
--

CREATE TABLE `user_presence_sessions` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `session_key` char(36) NOT NULL,
  `workspace_code` varchar(30) NOT NULL DEFAULT 'craft' COMMENT 'craft|studio',
  `connected_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_seen_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `left_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_presence_sessions`
--

INSERT INTO `user_presence_sessions` (`id`, `organization_id`, `user_id`, `session_key`, `workspace_code`, `connected_at`, `last_seen_at`, `left_at`) VALUES
(274, 1, 2, '1d57a2a2-4834-4aff-838d-4dd4566026e6', 'craft', '2026-09-09 01:14:05.346', '2026-09-09 01:18:09.883', '2026-09-09 01:18:14.944'),
(282, 1, 2, 'aa09854d-4286-450c-9923-7e197ba504bb', 'craft', '2026-09-09 01:29:34.986', '2026-09-09 01:29:35.012', '2026-09-09 01:29:40.208'),
(284, 1, 2, '5c7915d9-fe1b-42f2-b1f8-daf59aa68129', 'craft', '2026-09-09 01:48:02.331', '2026-09-09 01:48:02.345', '2026-09-09 01:48:06.122'),
(286, 1, 2, '54ff2050-66c5-48ac-a262-ba3eb0c205e9', 'craft', '2026-09-09 01:48:08.832', '2026-09-09 01:48:20.013', '2026-09-09 01:48:28.925'),
(289, 1, 2, 'b52dafad-d8a9-4aec-9c95-0be1eb94c9cf', 'craft', '2026-09-09 01:48:33.517', '2026-09-09 01:48:50.605', '2026-09-09 01:48:53.633'),
(292, 1, 2, 'bbf31602-b56b-4d15-8898-a7ced4ebbd21', 'craft', '2026-09-09 01:50:29.167', '2026-09-09 01:55:49.849', '2026-09-09 01:55:53.802'),
(297, 1, 2, 'adf911bf-73c5-4d59-a933-3163dc2c727d', 'craft', '2026-09-09 01:52:09.802', '2026-09-09 01:52:26.914', '2026-09-09 01:52:33.240'),
(303, 1, 2, 'dc5fa98a-8156-4eaf-ab3d-0ab488a2d231', 'craft', '2026-09-09 01:52:59.024', '2026-09-09 01:53:06.614', '2026-09-09 01:53:08.152'),
(307, 1, 2, 'b13cf035-b6c4-4de9-8532-2f6a4dbbc0d2', 'craft', '2026-09-09 01:53:17.953', '2026-09-09 01:53:47.859', '2026-09-09 01:53:49.696'),
(311, 1, 2, 'f59328bc-b9e5-41b0-afc3-0b988b3ee549', 'craft', '2026-09-09 01:53:52.997', '2026-09-09 01:53:57.543', '2026-09-09 01:53:58.406'),
(315, 1, 2, '7f3d378f-a13e-461c-8e35-1491c76147e6', 'craft', '2026-09-09 01:54:09.559', '2026-09-09 01:54:09.568', '2026-09-09 01:54:10.680'),
(320, 1, 2, 'ce342068-f4d6-4618-b342-7cd3b8387285', 'craft', '2026-09-09 01:56:15.596', '2026-09-09 01:56:15.599', '2026-09-09 01:56:24.695'),
(322, 1, 2, '36fc2f89-88b0-4788-9307-503fcb0804c9', 'craft', '2026-09-09 01:56:27.306', '2026-09-09 01:56:30.071', '2026-09-09 01:56:33.020'),
(325, 1, 2, '5e00af7d-666d-4c26-96cf-3754a7ecaebf', 'craft', '2026-09-09 01:56:51.656', '2026-09-09 01:59:07.124', '2026-09-09 01:59:10.186'),
(336, 1, 3, 'baf64b62-274a-4077-87ea-307f0c8738e9', 'craft', '2026-09-09 02:02:28.882', '2026-09-09 02:02:28.884', '2026-09-09 02:02:40.678'),
(338, 1, 4, '4a7157a6-67c3-4b43-8150-ffae2ab20e35', 'craft', '2026-09-09 02:02:50.119', '2026-09-09 02:02:50.126', '2026-09-09 02:03:05.668'),
(340, 1, 4, '5be212e1-a573-40a2-a480-3d70662f0872', 'craft', '2026-09-09 02:03:11.076', '2026-09-09 02:03:11.081', '2026-09-09 02:03:19.804'),
(342, 1, 9, '918022c9-0fba-4876-97ea-33e062822a25', 'craft', '2026-09-09 02:03:25.531', '2026-09-09 02:04:04.450', '2026-09-09 02:04:08.032'),
(346, 1, 3, '3573a0b5-5dc3-4943-bcd4-f1a8cf5cd231', 'craft', '2026-09-09 02:04:14.005', '2026-09-09 02:04:14.006', '2026-09-09 02:04:22.487'),
(348, 1, 9, '4162e093-9269-4d36-949b-406a2851b6f3', 'craft', '2026-09-09 02:04:26.188', '2026-09-09 02:04:58.904', '2026-09-09 02:05:01.768'),
(354, 1, 2, '51d523da-d738-4ada-8a70-cc7fb02484bb', 'craft', '2026-09-09 02:05:08.063', '2026-09-09 02:11:09.758', '2026-09-09 02:11:12.371'),
(378, 1, 394, '1990177f-56a0-4788-a52d-c886fc18f0c9', 'craft', '2026-09-09 02:11:17.423', '2026-09-09 02:11:17.426', NULL),
(380, 1, 394, '613cda6b-4ce7-4fb5-983c-fb2465c09289', 'craft', '2026-09-09 02:17:02.623', '2026-09-09 02:50:49.347', '2026-09-09 02:50:53.408'),
(386, 1, 2, '3657e393-12af-429e-a9e6-c3d3c89d7910', 'craft', '2026-09-09 02:54:05.976', '2026-09-09 02:59:43.947', '2026-09-09 02:59:58.363'),
(392, 1, 2, '200ffd08-0310-43b1-8fb1-85e5ecf968cd', 'craft', '2026-09-09 03:05:55.750', '2026-09-09 03:47:46.047', '2026-09-09 03:47:48.050'),
(412, 1, 394, '12073f16-a830-4b4a-baad-5e30d6054616', 'craft', '2026-09-09 03:47:53.248', '2026-09-09 03:59:07.027', '2026-09-09 03:59:09.435'),
(440, 1, 394, 'b4cfaf34-f065-400b-8b78-4972e0c14509', 'studio', '2026-09-09 03:58:53.392', '2026-09-09 06:19:16.918', '2026-09-09 06:19:19.811'),
(444, 1, 2, 'a64bf82d-8507-4a90-9635-e9353b51c1f8', 'craft', '2026-09-09 03:59:14.991', '2026-09-09 09:18:07.829', NULL),
(549, 1, 394, '5d70462a-bf11-41da-a91a-a18007388a7f', 'studio', '2026-09-09 06:19:37.535', '2026-09-09 09:44:23.995', NULL),
(672, 1, 2, 'd38321ce-a2fc-4a63-a034-73ae0195978d', 'craft', '2026-09-10 01:09:44.818', '2026-09-10 01:54:33.866', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_reactivation_requests`
--

CREATE TABLE `user_reactivation_requests` (
  `id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `deleted_user_id` bigint UNSIGNED NOT NULL,
  `requested_full_name` varchar(150) NOT NULL,
  `requested_username` varchar(100) NOT NULL,
  `requested_email` varchar(190) NOT NULL,
  `requested_password_hash` varchar(255) DEFAULT NULL,
  `requested_phone` varchar(50) DEFAULT NULL,
  `requested_default_workspace_code` varchar(30) NOT NULL DEFAULT 'craft' COMMENT 'craft|studio',
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|approved|rejected',
  `requested_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewed_by` bigint UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime(3) DEFAULT NULL,
  `review_note` varchar(500) DEFAULT NULL,
  `pending_deleted_user_id` bigint UNSIGNED GENERATED ALWAYS AS ((case when (`status_code` = _utf8mb4'pending') then `deleted_user_id` else NULL end)) STORED,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `role_id` bigint UNSIGNED NOT NULL,
  `business_unit_id` bigint UNSIGNED DEFAULT NULL COMMENT 'NULL = role applies globally',
  `assigned_by` bigint UNSIGNED DEFAULT NULL,
  `assigned_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `business_unit_id`, `assigned_by`, `assigned_at`) VALUES
(1, 2, 2, NULL, NULL, '2026-08-23 10:07:06.548'),
(2, 10, 7, NULL, NULL, '2026-08-23 10:49:37.868'),
(3, 9, 8, NULL, NULL, '2026-08-23 10:49:42.814'),
(4, 8, 7, NULL, NULL, '2026-08-23 10:49:46.823'),
(5, 7, 7, NULL, NULL, '2026-08-23 10:49:50.870'),
(6, 6, 7, NULL, NULL, '2026-08-23 10:49:54.446'),
(7, 5, 7, NULL, NULL, '2026-08-23 10:50:00.349'),
(8, 4, 3, NULL, NULL, '2026-08-23 10:50:05.934'),
(9, 3, 1, NULL, NULL, '2026-08-23 10:50:09.749'),
(310, 394, 8, NULL, 2, '2026-09-09 09:10:58.462');

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `session_token_hash` varchar(255) NOT NULL,
  `refresh_token_hash` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `device_name` varchar(150) DEFAULT NULL,
  `expires_at` datetime(3) NOT NULL,
  `revoked_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_seen_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_accounts_payable`
-- (See below for the actual view)
--
CREATE TABLE `v_accounts_payable` (
`balance_due` decimal(18,2)
,`business_unit_id` bigint unsigned
,`days_overdue` int
,`due_date` date
,`invoice_date` date
,`paid_amount` decimal(18,2)
,`status_code` varchar(30)
,`supplier_invoice_id` bigint unsigned
,`supplier_invoice_number` varchar(120)
,`supplier_name` varchar(200)
,`supplier_party_id` bigint unsigned
,`total_amount` decimal(18,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_accounts_receivable`
-- (See below for the actual view)
--
CREATE TABLE `v_accounts_receivable` (
`balance_due` decimal(18,2)
,`business_unit_id` bigint unsigned
,`days_overdue` int
,`due_date` date
,`invoice_id` bigint unsigned
,`invoice_number` varchar(80)
,`issue_date` date
,`paid_amount` decimal(18,2)
,`party_id` bigint unsigned
,`party_name` varchar(200)
,`status_code` varchar(30)
,`total_amount` decimal(18,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_craft_order_priority`
-- (See below for the actual view)
--
CREATE TABLE `v_craft_order_priority` (
`customer_name` varchar(200)
,`customer_party_id` bigint unsigned
,`deadline_at` datetime(3)
,`id` bigint unsigned
,`minutes_to_deadline` bigint
,`order_code` varchar(80)
,`order_date` datetime(3)
,`payment_status_code` varchar(30)
,`priority_code` varchar(20)
,`priority_score` decimal(10,3)
,`sales_channel_id` bigint unsigned
,`sales_channel_name` varchar(100)
,`status_code` varchar(30)
,`total_amount` decimal(18,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_material_stock`
-- (See below for the actual view)
--
CREATE TABLE `v_material_stock` (
`available_qty` decimal(41,4)
,`business_unit_id` bigint unsigned
,`color_name` varchar(100)
,`low_stock_threshold` decimal(18,4)
,`material_id` bigint unsigned
,`material_type` varchar(80)
,`name` varchar(180)
,`reserved_qty` decimal(40,4)
,`sku` varchar(80)
,`stock_status` varchar(12)
,`total_qty` decimal(40,4)
,`unit_symbol` varchar(20)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_printer_current_activity`
-- (See below for the actual view)
--
CREATE TABLE `v_printer_current_activity` (
`estimated_finish_at` datetime(3)
,`job_code` varchar(80)
,`job_name` varchar(200)
,`job_status` varchar(30)
,`print_job_id` bigint unsigned
,`printer_code` varchar(60)
,`printer_id` bigint unsigned
,`printer_name` varchar(150)
,`printer_status` varchar(30)
,`progress_percent` decimal(6,2)
,`started_at` datetime(3)
);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assets`
--
ALTER TABLE `assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `asset_code` (`asset_code`),
  ADD KEY `idx_assets_bu_status` (`business_unit_id`,`status_code`),
  ADD KEY `fk_assets_user` (`assigned_user_id`);

--
-- Indexes for table `asset_maintenance_records`
--
ALTER TABLE `asset_maintenance_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_asset_maintenance_asset_date` (`asset_id`,`performed_at`),
  ADD KEY `fk_asset_maintenance_party` (`performed_by_party_id`);

--
-- Indexes for table `asset_project_assignments`
--
ALTER TABLE `asset_project_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_asset_assignment_asset` (`asset_id`,`returned_at`),
  ADD KEY `idx_asset_assignment_project` (`project_id`),
  ADD KEY `fk_asset_assignment_user` (`assigned_by`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_logs_user_time` (`user_id`,`created_at`),
  ADD KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`,`created_at`),
  ADD KEY `idx_audit_logs_module` (`module_code`,`action_code`,`created_at`),
  ADD KEY `fk_audit_logs_bu` (`business_unit_id`),
  ADD KEY `idx_audit_logs_org_time` (`organization_id`,`created_at`,`id`),
  ADD KEY `idx_audit_logs_org_bu_time` (`organization_id`,`business_unit_id`,`created_at`,`id`),
  ADD KEY `idx_audit_logs_org_module_time` (`organization_id`,`module_code`,`created_at`,`id`),
  ADD KEY `idx_audit_logs_org_action_time` (`organization_id`,`action_code`,`created_at`,`id`);

--
-- Indexes for table `automation_rules`
--
ALTER TABLE `automation_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rule_code` (`rule_code`),
  ADD KEY `fk_automation_rules_org` (`organization_id`),
  ADD KEY `fk_automation_rules_user` (`created_by`),
  ADD KEY `idx_automation_rules_due` (`business_unit_id`,`trigger_type`,`status_code`,`next_run_at`),
  ADD KEY `idx_automation_rules_event` (`business_unit_id`,`trigger_event`,`status_code`),
  ADD KEY `fk_automation_rules_updated_by` (`updated_by`);

--
-- Indexes for table `automation_runs`
--
ALTER TABLE `automation_runs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_automation_run_key` (`run_key`),
  ADD KEY `idx_automation_runs_rule_time` (`rule_id`,`started_at`),
  ADD KEY `idx_automation_runs_queue` (`status_code`,`next_attempt_at`,`started_at`),
  ADD KEY `idx_automation_runs_entity` (`trigger_entity_type`,`trigger_entity_id`,`started_at`),
  ADD KEY `fk_automation_runs_initiated_by` (`initiated_by`);

--
-- Indexes for table `budgets`
--
ALTER TABLE `budgets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `budget_code` (`budget_code`),
  ADD KEY `fk_budgets_org` (`organization_id`),
  ADD KEY `fk_budgets_bu` (`business_unit_id`),
  ADD KEY `fk_budgets_created_by` (`created_by`),
  ADD KEY `fk_budgets_approved_by` (`approved_by`);

--
-- Indexes for table `budget_items`
--
ALTER TABLE `budget_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_budget_items_budget` (`budget_id`),
  ADD KEY `fk_budget_items_category` (`category_id`);

--
-- Indexes for table `business_units`
--
ALTER TABLE `business_units`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_business_unit_org_code` (`organization_id`,`code`),
  ADD KEY `idx_business_units_type` (`unit_type`);

--
-- Indexes for table `calendar_events`
--
ALTER TABLE `calendar_events`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_calendar_events_org_code` (`organization_id`,`event_code`),
  ADD UNIQUE KEY `uq_calendar_events_org_source_key` (`organization_id`,`source_key`),
  ADD KEY `idx_calendar_events_time` (`start_at`,`end_at`),
  ADD KEY `idx_calendar_events_source` (`source_type`,`source_id`),
  ADD KEY `fk_calendar_events_bu` (`business_unit_id`),
  ADD KEY `fk_calendar_events_user` (`created_by`),
  ADD KEY `idx_calendar_events_org_scope_time` (`organization_id`,`business_unit_id`,`deleted_at`,`start_at`,`id`),
  ADD KEY `idx_calendar_events_org_module_time` (`organization_id`,`source_module_code`,`start_at`,`id`),
  ADD KEY `idx_calendar_events_updated_by` (`updated_by`);

--
-- Indexes for table `calendar_event_attendees`
--
ALTER TABLE `calendar_event_attendees`
  ADD PRIMARY KEY (`event_id`,`user_id`),
  ADD KEY `idx_calendar_attendees_user` (`user_id`,`event_id`),
  ADD KEY `idx_calendar_attendees_added_by` (`added_by`);

--
-- Indexes for table `channel_product_mappings`
--
ALTER TABLE `channel_product_mappings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_channel_product_variant` (`sales_channel_id`,`product_id`,`variant_id`),
  ADD UNIQUE KEY `uq_channel_product_external_sku` (`sales_channel_id`,`external_sku`),
  ADD KEY `fk_channel_product_mapping_product` (`product_id`),
  ADD KEY `fk_channel_product_mapping_variant` (`variant_id`);

--
-- Indexes for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_coa_org_code` (`organization_id`,`account_code`),
  ADD KEY `idx_coa_type` (`account_type`,`is_active`),
  ADD KEY `fk_coa_bu` (`business_unit_id`),
  ADD KEY `fk_coa_parent` (`parent_account_id`);

--
-- Indexes for table `craft_orders`
--
ALTER TABLE `craft_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_code` (`order_code`),
  ADD UNIQUE KEY `uq_craft_orders_channel_external` (`sales_channel_id`,`external_order_id`),
  ADD KEY `idx_craft_orders_priority` (`status_code`,`deadline_at`,`priority_score`),
  ADD KEY `idx_craft_orders_customer` (`customer_party_id`,`order_date`),
  ADD KEY `idx_craft_orders_channel` (`sales_channel_id`,`order_date`),
  ADD KEY `idx_craft_orders_payment` (`payment_status_code`),
  ADD KEY `fk_craft_orders_bu` (`business_unit_id`),
  ADD KEY `fk_craft_orders_user` (`created_by`);

--
-- Indexes for table `craft_order_drafts`
--
ALTER TABLE `craft_order_drafts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_craft_order_drafts_code` (`draft_code`),
  ADD KEY `idx_craft_order_drafts_active` (`business_unit_id`,`status_code`,`updated_at`),
  ADD KEY `idx_craft_order_drafts_creator` (`created_by`,`status_code`,`updated_at`),
  ADD KEY `idx_craft_order_drafts_converted_order` (`converted_order_id`),
  ADD KEY `fk_craft_order_drafts_updated_by` (`updated_by`);

--
-- Indexes for table `craft_order_items`
--
ALTER TABLE `craft_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_items_order` (`order_id`),
  ADD KEY `fk_order_items_product` (`product_id`),
  ADD KEY `fk_order_items_variant` (`variant_id`),
  ADD KEY `fk_order_items_profile` (`print_profile_id`);

--
-- Indexes for table `craft_order_status_history`
--
ALTER TABLE `craft_order_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_status_history_order` (`order_id`,`changed_at`),
  ADD KEY `fk_order_status_history_user` (`changed_by`);

--
-- Indexes for table `design_files`
--
ALTER TABLE `design_files`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `design_code` (`design_code`),
  ADD KEY `idx_design_files_product` (`product_id`,`variant_id`),
  ADD KEY `fk_design_files_bu` (`business_unit_id`),
  ADD KEY `fk_design_files_variant` (`variant_id`),
  ADD KEY `fk_design_files_user` (`uploaded_by`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_documents_org_code_version` (`organization_id`,`document_code`,`version_no`),
  ADD KEY `idx_documents_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_documents_type_date` (`document_type`,`created_at`),
  ADD KEY `fk_documents_bu` (`business_unit_id`),
  ADD KEY `fk_documents_user` (`uploaded_by`),
  ADD KEY `idx_documents_org_scope_archive_time` (`organization_id`,`business_unit_id`,`archived_at`,`created_at`,`id`),
  ADD KEY `idx_documents_org_type_archive_time` (`organization_id`,`document_type`,`archived_at`,`created_at`,`id`),
  ADD KEY `idx_documents_org_module_archive_time` (`organization_id`,`source_module_code`,`archived_at`,`created_at`,`id`),
  ADD KEY `idx_documents_org_entity` (`organization_id`,`entity_type`,`entity_id`,`created_at`),
  ADD KEY `idx_documents_archived_by` (`archived_by`);

--
-- Indexes for table `document_templates`
--
ALTER TABLE `document_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `template_code` (`template_code`),
  ADD KEY `fk_document_templates_org` (`organization_id`),
  ADD KEY `fk_document_templates_bu` (`business_unit_id`),
  ADD KEY `fk_document_templates_user` (`created_by`);

--
-- Indexes for table `domain_events`
--
ALTER TABLE `domain_events`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_domain_events_event_key` (`event_key`),
  ADD KEY `idx_domain_events_queue` (`status_code`,`available_at`,`id`),
  ADD KEY `idx_domain_events_name` (`business_unit_id`,`event_name`,`status_code`),
  ADD KEY `idx_domain_events_entity` (`entity_type`,`entity_id`,`created_at`),
  ADD KEY `idx_domain_events_correlation` (`correlation_id`,`created_at`),
  ADD KEY `fk_domain_events_org` (`organization_id`),
  ADD KEY `fk_domain_events_actor` (`actor_user_id`),
  ADD KEY `fk_domain_events_causation` (`causation_event_id`),
  ADD KEY `fk_domain_events_automation_run` (`source_automation_run_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `expense_code` (`expense_code`),
  ADD KEY `idx_expenses_bu_date` (`business_unit_id`,`expense_date`),
  ADD KEY `idx_expenses_project` (`studio_project_id`),
  ADD KEY `idx_expenses_order` (`craft_order_id`),
  ADD KEY `fk_expenses_org` (`organization_id`),
  ADD KEY `fk_expenses_category` (`category_id`),
  ADD KEY `fk_expenses_party` (`party_id`),
  ADD KEY `fk_expenses_treasury` (`treasury_account_id`),
  ADD KEY `fk_expenses_transaction` (`financial_transaction_id`),
  ADD KEY `fk_expenses_created_by` (`created_by`),
  ADD KEY `fk_expenses_approved_by` (`approved_by`);

--
-- Indexes for table `filament_spools`
--
ALTER TABLE `filament_spools`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `material_batch_id` (`material_batch_id`),
  ADD UNIQUE KEY `spool_code` (`spool_code`);

--
-- Indexes for table `financial_periods`
--
ALTER TABLE `financial_periods`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_financial_period` (`organization_id`,`period_code`),
  ADD KEY `fk_financial_period_user` (`closed_by`),
  ADD KEY `idx_financial_periods_org_dates` (`organization_id`,`start_date`,`end_date`,`status_code`);

--
-- Indexes for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_code` (`transaction_code`),
  ADD UNIQUE KEY `uq_fin_transactions_org_idempotency` (`organization_id`,`idempotency_key`),
  ADD KEY `idx_fin_transactions_bu_date` (`business_unit_id`,`transaction_date`,`transaction_type`),
  ADD KEY `idx_fin_transactions_source` (`source_type`,`source_id`),
  ADD KEY `idx_fin_transactions_account` (`treasury_account_id`,`transaction_date`),
  ADD KEY `fk_fin_transactions_category` (`category_id`),
  ADD KEY `fk_fin_transactions_party` (`party_id`),
  ADD KEY `fk_fin_transactions_created_by` (`created_by`),
  ADD KEY `fk_fin_transactions_posted_by` (`posted_by`),
  ADD KEY `idx_fin_transactions_org_status_currency_date` (`organization_id`,`status_code`,`currency_code`,`transaction_date`,`business_unit_id`,`transaction_type`);

--
-- Indexes for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `fk_goods_receipts_bu` (`business_unit_id`),
  ADD KEY `fk_goods_receipts_po` (`purchase_order_id`),
  ADD KEY `fk_goods_receipts_user` (`received_by`);

--
-- Indexes for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_goods_receipt_items_receipt` (`goods_receipt_id`),
  ADD KEY `fk_goods_receipt_items_po_item` (`purchase_order_item_id`),
  ADD KEY `fk_goods_receipt_items_batch` (`material_batch_id`);

--
-- Indexes for table `integrations`
--
ALTER TABLE `integrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_integration` (`organization_id`,`business_unit_id`,`integration_code`),
  ADD KEY `fk_integrations_bu` (`business_unit_id`),
  ADD KEY `fk_integrations_user` (`created_by`),
  ADD KEY `idx_integrations_sales_channel` (`sales_channel_id`);

--
-- Indexes for table `integration_secrets`
--
ALTER TABLE `integration_secrets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_integration_secret` (`integration_id`,`secret_name`),
  ADD KEY `fk_integration_secrets_created_by` (`created_by`),
  ADD KEY `fk_integration_secrets_updated_by` (`updated_by`);

--
-- Indexes for table `integration_sync_logs`
--
ALTER TABLE `integration_sync_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sync_logs_integration_time` (`integration_id`,`started_at`);

--
-- Indexes for table `internal_transfers`
--
ALTER TABLE `internal_transfers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transfer_code` (`transfer_code`),
  ADD UNIQUE KEY `uq_internal_transfers_org_idempotency` (`organization_id`,`idempotency_key`),
  ADD KEY `idx_internal_transfer_date` (`transfer_date`),
  ADD KEY `fk_internal_transfer_from_bu` (`from_business_unit_id`),
  ADD KEY `fk_internal_transfer_to_bu` (`to_business_unit_id`),
  ADD KEY `fk_internal_transfer_from_account` (`from_treasury_account_id`),
  ADD KEY `fk_internal_transfer_to_account` (`to_treasury_account_id`),
  ADD KEY `fk_internal_transfer_journal` (`journal_entry_id`),
  ADD KEY `fk_internal_transfer_user` (`created_by`),
  ADD KEY `idx_internal_transfers_org_date_units` (`organization_id`,`transfer_date`,`from_business_unit_id`,`to_business_unit_id`,`status_code`);

--
-- Indexes for table `inventory_movements`
--
ALTER TABLE `inventory_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inventory_movements_material_time` (`material_id`,`occurred_at`),
  ADD KEY `idx_inventory_movements_reference` (`reference_type`,`reference_id`),
  ADD KEY `fk_inventory_movement_bu` (`business_unit_id`),
  ADD KEY `fk_inventory_movement_batch` (`material_batch_id`),
  ADD KEY `fk_inventory_movement_unit` (`unit_id`),
  ADD KEY `fk_inventory_movement_user` (`created_by`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `idx_invoices_party_due` (`party_id`,`due_date`,`status_code`),
  ADD KEY `idx_invoices_bu_date` (`business_unit_id`,`issue_date`),
  ADD KEY `idx_invoices_source` (`source_type`,`source_id`),
  ADD KEY `fk_invoices_quotation` (`quotation_id`),
  ADD KEY `fk_invoices_user` (`created_by`),
  ADD KEY `idx_invoices_org_bu_status_due_currency` (`organization_id`,`business_unit_id`,`status_code`,`due_date`,`currency_code`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_invoice_items_invoice` (`invoice_id`),
  ADD KEY `fk_invoice_items_product` (`product_id`),
  ADD KEY `fk_invoice_items_service` (`service_id`);

--
-- Indexes for table `invoice_payment_schedules`
--
ALTER TABLE `invoice_payment_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_invoice_installment` (`invoice_id`,`installment_no`),
  ADD KEY `idx_invoice_payment_schedule_due` (`status_code`,`due_date`);

--
-- Indexes for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `journal_number` (`journal_number`),
  ADD KEY `idx_journal_entries_date` (`business_unit_id`,`entry_date`),
  ADD KEY `fk_journal_entries_period` (`financial_period_id`),
  ADD KEY `fk_journal_entries_tx` (`source_transaction_id`),
  ADD KEY `fk_journal_entries_reversal` (`reversal_of_id`),
  ADD KEY `fk_journal_entries_created_by` (`created_by`),
  ADD KEY `fk_journal_entries_posted_by` (`posted_by`),
  ADD KEY `idx_journal_entries_org_date_bu` (`organization_id`,`entry_date`,`business_unit_id`,`status_code`);

--
-- Indexes for table `journal_lines`
--
ALTER TABLE `journal_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_journal_lines_account` (`coa_account_id`),
  ADD KEY `fk_journal_lines_entry` (`journal_entry_id`),
  ADD KEY `fk_journal_lines_party` (`party_id`);

--
-- Indexes for table `login_history`
--
ALTER TABLE `login_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_login_history_user_time` (`user_id`,`logged_at`);

--
-- Indexes for table `marketplace_fee_rules`
--
ALTER TABLE `marketplace_fee_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_marketplace_fee_channel_dates` (`sales_channel_id`,`effective_from`,`effective_until`);

--
-- Indexes for table `marketplace_settlements`
--
ALTER TABLE `marketplace_settlements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `settlement_code` (`settlement_code`),
  ADD UNIQUE KEY `uq_marketplace_settlement_fin_tx` (`financial_transaction_id`),
  ADD KEY `fk_marketplace_settlement_channel` (`sales_channel_id`),
  ADD KEY `fk_marketplace_settlement_treasury` (`treasury_account_id`);

--
-- Indexes for table `marketplace_settlement_items`
--
ALTER TABLE `marketplace_settlement_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_marketplace_settlement_items_settlement` (`settlement_id`),
  ADD KEY `fk_marketplace_settlement_items_order` (`order_id`);

--
-- Indexes for table `master_options`
--
ALTER TABLE `master_options`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_master_option` (`organization_id`,`group_key`,`code`),
  ADD KEY `idx_master_options_group` (`group_key`,`is_active`);

--
-- Indexes for table `materials`
--
ALTER TABLE `materials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `idx_materials_bu_category` (`business_unit_id`,`category_id`),
  ADD KEY `idx_materials_name` (`name`),
  ADD KEY `fk_materials_category` (`category_id`),
  ADD KEY `fk_materials_unit` (`base_unit_id`),
  ADD KEY `fk_materials_supplier` (`preferred_supplier_id`);

--
-- Indexes for table `material_batches`
--
ALTER TABLE `material_batches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `batch_code` (`batch_code`),
  ADD KEY `idx_material_batches_material_status` (`material_id`,`status_code`),
  ADD KEY `fk_material_batches_supplier` (`supplier_id`),
  ADD KEY `idx_material_batches_purchase_order_item` (`purchase_order_item_id`);

--
-- Indexes for table `material_categories`
--
ALTER TABLE `material_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_material_category` (`business_unit_id`,`code`);

--
-- Indexes for table `material_waste`
--
ALTER TABLE `material_waste`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_material_waste_material_time` (`material_id`,`occurred_at`),
  ADD KEY `fk_material_waste_batch` (`material_batch_id`),
  ADD KEY `fk_material_waste_unit` (`unit_id`),
  ADD KEY `fk_material_waste_user` (`created_by`),
  ADD KEY `fk_material_waste_print_job` (`print_job_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_notifications_dedupe_key` (`dedupe_key`),
  ADD KEY `idx_notifications_user_read` (`user_id`,`is_read`,`created_at`),
  ADD KEY `fk_notifications_org` (`organization_id`),
  ADD KEY `fk_notifications_bu` (`business_unit_id`),
  ADD KEY `idx_notifications_user_scope_time` (`user_id`,`business_unit_id`,`created_at`),
  ADD KEY `idx_notifications_user_module_time` (`user_id`,`module_code`,`created_at`),
  ADD KEY `idx_notifications_user_severity_read` (`user_id`,`severity_code`,`is_read`,`created_at`);

--
-- Indexes for table `order_attachments`
--
ALTER TABLE `order_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_order_attachments_order` (`order_id`),
  ADD KEY `fk_order_attachments_user` (`uploaded_by`);

--
-- Indexes for table `organizations`
--
ALTER TABLE `organizations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `parties`
--
ALTER TABLE `parties`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_parties_org_name` (`organization_id`,`display_name`),
  ADD KEY `idx_parties_status` (`status_code`);

--
-- Indexes for table `partner_price_rules`
--
ALTER TABLE `partner_price_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_partner_price_party_product` (`partner_party_id`,`product_id`),
  ADD KEY `fk_partner_price_product` (`product_id`),
  ADD KEY `fk_partner_price_variant` (`variant_id`);

--
-- Indexes for table `party_contacts`
--
ALTER TABLE `party_contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_party_contacts_party` (`party_id`,`is_primary`);

--
-- Indexes for table `party_roles`
--
ALTER TABLE `party_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_party_role` (`party_id`,`business_unit_id`,`role_code`),
  ADD KEY `idx_party_roles_role` (`role_code`,`is_active`),
  ADD KEY `fk_party_roles_bu` (`business_unit_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payment_code` (`payment_code`),
  ADD KEY `idx_payments_invoice` (`invoice_id`,`payment_date`),
  ADD KEY `idx_payments_party` (`party_id`,`payment_date`),
  ADD KEY `fk_payments_org` (`organization_id`),
  ADD KEY `fk_payments_bu` (`business_unit_id`),
  ADD KEY `fk_payments_schedule` (`payment_schedule_id`),
  ADD KEY `fk_payments_method` (`payment_method_id`),
  ADD KEY `fk_payments_treasury` (`treasury_account_id`),
  ADD KEY `fk_payments_transaction` (`financial_transaction_id`),
  ADD KEY `fk_payments_received_by` (`received_by`),
  ADD KEY `idx_payments_supplier_invoice` (`supplier_invoice_id`,`payment_date`);

--
-- Indexes for table `payment_methods`
--
ALTER TABLE `payment_methods`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `printers`
--
ALTER TABLE `printers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_printers_bu_status` (`business_unit_id`,`status_code`);

--
-- Indexes for table `printer_issues`
--
ALTER TABLE `printer_issues`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `issue_code` (`issue_code`),
  ADD KEY `idx_printer_issues_status` (`printer_id`,`status_code`,`severity_code`),
  ADD KEY `fk_printer_issues_reported_by` (`reported_by`),
  ADD KEY `fk_printer_issues_assigned_to` (`assigned_to`);

--
-- Indexes for table `printer_maintenance_records`
--
ALTER TABLE `printer_maintenance_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_printer_maintenance_printer_date` (`printer_id`,`performed_at`),
  ADD KEY `fk_printer_maintenance_record_schedule` (`schedule_id`),
  ADD KEY `fk_printer_maintenance_record_user` (`performed_by`);

--
-- Indexes for table `printer_maintenance_schedules`
--
ALTER TABLE `printer_maintenance_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_printer_maintenance_schedule` (`printer_id`);

--
-- Indexes for table `print_failures`
--
ALTER TABLE `print_failures`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_print_failures_job` (`print_job_id`,`occurred_at`),
  ADD KEY `fk_print_failures_reprint` (`reprint_job_id`),
  ADD KEY `fk_print_failures_user` (`reported_by`);

--
-- Indexes for table `print_jobs`
--
ALTER TABLE `print_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `job_code` (`job_code`),
  ADD KEY `idx_print_jobs_printer_status` (`printer_id`,`status_code`),
  ADD KEY `idx_print_jobs_order` (`order_id`,`order_item_id`),
  ADD KEY `idx_print_jobs_schedule` (`status_code`,`scheduled_start_at`),
  ADD KEY `fk_print_jobs_bu` (`business_unit_id`),
  ADD KEY `fk_print_jobs_queue` (`queue_item_id`),
  ADD KEY `fk_print_jobs_order_item` (`order_item_id`),
  ADD KEY `fk_print_jobs_product` (`product_id`),
  ADD KEY `fk_print_jobs_variant` (`variant_id`),
  ADD KEY `fk_print_jobs_profile` (`print_profile_id`),
  ADD KEY `fk_print_jobs_design` (`design_file_id`),
  ADD KEY `fk_print_jobs_operator` (`operator_user_id`);

--
-- Indexes for table `print_job_materials`
--
ALTER TABLE `print_job_materials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_print_job_material` (`print_job_id`,`material_id`,`material_batch_id`),
  ADD KEY `fk_print_job_material_material` (`material_id`),
  ADD KEY `fk_print_job_material_batch` (`material_batch_id`),
  ADD KEY `fk_print_job_material_reservation` (`reservation_id`),
  ADD KEY `fk_print_job_material_unit` (`unit_id`);

--
-- Indexes for table `print_job_status_history`
--
ALTER TABLE `print_job_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_print_job_history_job` (`print_job_id`,`changed_at`),
  ADD KEY `fk_print_job_history_user` (`changed_by`);

--
-- Indexes for table `print_profiles`
--
ALTER TABLE `print_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_print_profiles_product` (`product_id`,`variant_id`),
  ADD KEY `fk_print_profiles_bu` (`business_unit_id`),
  ADD KEY `fk_print_profiles_variant` (`variant_id`),
  ADD KEY `fk_print_profiles_printer` (`printer_id`),
  ADD KEY `fk_print_profiles_unit` (`estimated_material_unit_id`);

--
-- Indexes for table `production_queue_items`
--
ALTER TABLE `production_queue_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_queue_active_item` (`order_item_id`,`status_code`),
  ADD KEY `idx_production_queue_ordering` (`status_code`,`queue_position`,`priority_score`),
  ADD KEY `fk_production_queue_bu` (`business_unit_id`),
  ADD KEY `fk_production_queue_order` (`order_id`),
  ADD KEY `fk_production_queue_user` (`created_by`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `idx_products_bu_category` (`business_unit_id`,`category_id`),
  ADD KEY `idx_products_name` (`name`),
  ADD KEY `fk_products_category` (`category_id`);

--
-- Indexes for table `product_boms`
--
ALTER TABLE `product_boms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_bom_version` (`product_id`,`variant_id`,`version_no`),
  ADD KEY `fk_product_boms_variant` (`variant_id`);

--
-- Indexes for table `product_bom_items`
--
ALTER TABLE `product_bom_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_bom_material` (`bom_id`,`material_id`),
  ADD KEY `fk_product_bom_items_material` (`material_id`),
  ADD KEY `fk_product_bom_items_unit` (`unit_id`);

--
-- Indexes for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_category` (`business_unit_id`,`code`),
  ADD KEY `fk_product_categories_parent` (`parent_id`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `fk_product_variants_product` (`product_id`);

--
-- Indexes for table `project_deliverables`
--
ALTER TABLE `project_deliverables`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_project_deliverables_project` (`project_id`,`status_code`),
  ADD KEY `fk_project_deliverables_milestone` (`milestone_id`);

--
-- Indexes for table `project_external_assignments`
--
ALTER TABLE `project_external_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_project_external_party` (`project_id`,`party_id`),
  ADD KEY `fk_project_external_party` (`party_id`);

--
-- Indexes for table `project_milestones`
--
ALTER TABLE `project_milestones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_project_milestones_project_due` (`project_id`,`due_at`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `po_number` (`po_number`),
  ADD KEY `idx_purchase_orders_supplier_date` (`supplier_party_id`,`order_date`),
  ADD KEY `fk_purchase_orders_bu` (`business_unit_id`),
  ADD KEY `fk_purchase_orders_request` (`purchase_request_id`),
  ADD KEY `fk_purchase_orders_user` (`created_by`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_purchase_order_items_order` (`purchase_order_id`),
  ADD KEY `fk_purchase_order_items_material` (`material_id`),
  ADD KEY `fk_purchase_order_items_unit` (`unit_id`),
  ADD KEY `idx_purchase_order_items_request_item` (`purchase_request_item_id`);

--
-- Indexes for table `purchase_requests`
--
ALTER TABLE `purchase_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_code` (`request_code`),
  ADD KEY `fk_purchase_requests_bu` (`business_unit_id`),
  ADD KEY `fk_purchase_requests_requested_by` (`requested_by`),
  ADD KEY `fk_purchase_requests_approved_by` (`approved_by`);

--
-- Indexes for table `purchase_request_items`
--
ALTER TABLE `purchase_request_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_purchase_request_items_request` (`purchase_request_id`),
  ADD KEY `fk_purchase_request_items_material` (`material_id`),
  ADD KEY `fk_purchase_request_items_unit` (`unit_id`);

--
-- Indexes for table `qc_inspections`
--
ALTER TABLE `qc_inspections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_qc_inspections_job` (`print_job_id`),
  ADD KEY `fk_qc_inspections_template` (`template_id`),
  ADD KEY `fk_qc_inspections_user` (`inspector_user_id`);

--
-- Indexes for table `qc_inspection_items`
--
ALTER TABLE `qc_inspection_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_qc_inspection_items_inspection` (`inspection_id`),
  ADD KEY `fk_qc_inspection_items_template_item` (`template_item_id`);

--
-- Indexes for table `qc_templates`
--
ALTER TABLE `qc_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_qc_templates_bu` (`business_unit_id`);

--
-- Indexes for table `qc_template_items`
--
ALTER TABLE `qc_template_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_qc_template_item` (`template_id`,`item_code`);

--
-- Indexes for table `quick_links`
--
ALTER TABLE `quick_links`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_quick_links_org` (`organization_id`),
  ADD KEY `fk_quick_links_bu` (`business_unit_id`);

--
-- Indexes for table `quotations`
--
ALTER TABLE `quotations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `quotation_number` (`quotation_number`),
  ADD KEY `idx_quotations_party_status` (`party_id`,`status_code`),
  ADD KEY `fk_quotations_org` (`organization_id`),
  ADD KEY `fk_quotations_bu` (`business_unit_id`),
  ADD KEY `fk_quotations_project` (`project_id`),
  ADD KEY `fk_quotations_order` (`order_id`),
  ADD KEY `fk_quotations_user` (`created_by`);

--
-- Indexes for table `quotation_items`
--
ALTER TABLE `quotation_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_quotation_items_quotation` (`quotation_id`),
  ADD KEY `fk_quotation_items_service` (`service_id`),
  ADD KEY `fk_quotation_items_product` (`product_id`);

--
-- Indexes for table `quotation_templates`
--
ALTER TABLE `quotation_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `template_code` (`template_code`),
  ADD KEY `fk_quotation_templates_org` (`organization_id`),
  ADD KEY `fk_quotation_templates_bu` (`business_unit_id`),
  ADD KEY `fk_quotation_templates_user` (`created_by`);

--
-- Indexes for table `quotation_template_items`
--
ALTER TABLE `quotation_template_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_quotation_template_items_template` (`template_id`),
  ADD KEY `fk_quotation_template_items_service` (`service_id`),
  ADD KEY `fk_quotation_template_items_product` (`product_id`);

--
-- Indexes for table `report_definitions`
--
ALTER TABLE `report_definitions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `report_code` (`report_code`),
  ADD KEY `fk_report_definitions_org` (`organization_id`),
  ADD KEY `fk_report_definitions_bu` (`business_unit_id`),
  ADD KEY `fk_report_definitions_user` (`created_by`);

--
-- Indexes for table `report_exports`
--
ALTER TABLE `report_exports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_report_exports_definition` (`report_definition_id`),
  ADD KEY `fk_report_exports_org` (`organization_id`),
  ADD KEY `fk_report_exports_bu` (`business_unit_id`),
  ADD KEY `fk_report_exports_user` (`generated_by`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_roles_org_code` (`organization_id`,`code`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `fk_role_permissions_permission` (`permission_id`);

--
-- Indexes for table `sales_channels`
--
ALTER TABLE `sales_channels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sales_channel` (`business_unit_id`,`code`);

--
-- Indexes for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `fk_service_packages_bu` (`business_unit_id`);

--
-- Indexes for table `service_package_items`
--
ALTER TABLE `service_package_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_service_package_item` (`package_id`,`service_id`),
  ADD KEY `fk_service_package_items_service` (`service_id`);

--
-- Indexes for table `stock_reservations`
--
ALTER TABLE `stock_reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_stock_reservation_ref` (`reference_type`,`reference_id`,`status_code`),
  ADD KEY `fk_stock_reservation_material` (`material_id`),
  ADD KEY `fk_stock_reservation_batch` (`material_batch_id`),
  ADD KEY `fk_stock_reservation_unit` (`unit_id`),
  ADD KEY `fk_stock_reservation_user` (`created_by`);

--
-- Indexes for table `studio_projects`
--
ALTER TABLE `studio_projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `project_code` (`project_code`),
  ADD KEY `idx_studio_projects_status_deadline` (`status_code`,`deadline_at`),
  ADD KEY `idx_studio_projects_client` (`client_party_id`,`created_at`),
  ADD KEY `fk_studio_projects_bu` (`business_unit_id`),
  ADD KEY `fk_studio_projects_pm` (`project_manager_user_id`),
  ADD KEY `fk_studio_projects_created_by` (`created_by`);

--
-- Indexes for table `studio_project_members`
--
ALTER TABLE `studio_project_members`
  ADD PRIMARY KEY (`project_id`,`user_id`),
  ADD KEY `fk_project_members_user` (`user_id`);

--
-- Indexes for table `studio_project_services`
--
ALTER TABLE `studio_project_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_project_services_project` (`project_id`),
  ADD KEY `fk_project_services_service` (`service_id`),
  ADD KEY `fk_project_services_package` (`package_id`);

--
-- Indexes for table `studio_project_status_history`
--
ALTER TABLE `studio_project_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_project_status_history` (`project_id`,`changed_at`),
  ADD KEY `fk_project_status_history_user` (`changed_by`);

--
-- Indexes for table `studio_services`
--
ALTER TABLE `studio_services`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `fk_studio_services_bu` (`business_unit_id`),
  ADD KEY `fk_studio_services_category` (`category_id`);

--
-- Indexes for table `studio_service_categories`
--
ALTER TABLE `studio_service_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_studio_service_category` (`business_unit_id`,`code`);

--
-- Indexes for table `supplier_invoices`
--
ALTER TABLE `supplier_invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_supplier_invoice` (`supplier_party_id`,`supplier_invoice_number`),
  ADD KEY `idx_supplier_invoices_due` (`status_code`,`due_date`),
  ADD KEY `fk_supplier_invoices_po` (`purchase_order_id`),
  ADD KEY `idx_supplier_invoices_bu_status_due` (`business_unit_id`,`status_code`,`due_date`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_system_setting` (`organization_id`,`business_unit_id`,`setting_group`,`setting_key`),
  ADD UNIQUE KEY `uq_system_setting_scope` (`organization_id`,`scope_business_unit_id`,`setting_group`,`setting_key`),
  ADD KEY `fk_system_settings_user` (`updated_by`),
  ADD KEY `fk_system_settings_bu` (`business_unit_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tasks_org_code` (`organization_id`,`task_code`),
  ADD UNIQUE KEY `uq_tasks_org_source_key` (`organization_id`,`source_key`),
  ADD KEY `idx_tasks_status_due` (`status_code`,`due_at`),
  ADD KEY `fk_tasks_bu` (`business_unit_id`),
  ADD KEY `fk_tasks_created_by` (`created_by`),
  ADD KEY `idx_tasks_org_scope_status_due` (`organization_id`,`business_unit_id`,`deleted_at`,`status_code`,`due_at`,`id`),
  ADD KEY `idx_tasks_org_source` (`organization_id`,`source_module_code`,`source_type`,`source_id`),
  ADD KEY `idx_tasks_updated_by` (`updated_by`);

--
-- Indexes for table `task_assignees`
--
ALTER TABLE `task_assignees`
  ADD PRIMARY KEY (`task_id`,`user_id`),
  ADD KEY `fk_task_assignees_user` (`user_id`),
  ADD KEY `idx_task_assignees_assigned_by` (`assigned_by`);

--
-- Indexes for table `transaction_categories`
--
ALTER TABLE `transaction_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_transaction_category` (`organization_id`,`business_unit_id`,`code`),
  ADD KEY `fk_transaction_categories_bu` (`business_unit_id`),
  ADD KEY `fk_transaction_categories_coa` (`default_coa_account_id`);

--
-- Indexes for table `treasury_accounts`
--
ALTER TABLE `treasury_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_code` (`account_code`),
  ADD KEY `fk_treasury_accounts_bu` (`business_unit_id`),
  ADD KEY `fk_treasury_accounts_coa` (`coa_account_id`),
  ADD KEY `idx_treasury_org_bu_active_currency` (`organization_id`,`business_unit_id`,`is_active`,`currency_code`);

--
-- Indexes for table `units_of_measure`
--
ALTER TABLE `units_of_measure`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `employee_code` (`employee_code`),
  ADD KEY `idx_users_org_status` (`organization_id`,`status_code`),
  ADD KEY `idx_users_approval_status` (`organization_id`,`approval_status_code`,`created_at`),
  ADD KEY `idx_users_approved_by` (`approved_by`),
  ADD KEY `idx_users_rejected_by` (`rejected_by`);

--
-- Indexes for table `user_business_units`
--
ALTER TABLE `user_business_units`
  ADD PRIMARY KEY (`user_id`,`business_unit_id`),
  ADD KEY `fk_user_bu_unit` (`business_unit_id`);

--
-- Indexes for table `user_deletion_requests`
--
ALTER TABLE `user_deletion_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_deletion_requests_pending_user` (`pending_user_id`),
  ADD KEY `idx_user_deletion_requests_queue` (`organization_id`,`status_code`,`requested_at`),
  ADD KEY `idx_user_deletion_requests_history` (`user_id`,`requested_at`),
  ADD KEY `idx_user_deletion_requests_reviewer` (`reviewed_by`);

--
-- Indexes for table `user_presence_sessions`
--
ALTER TABLE `user_presence_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_presence_session` (`user_id`,`session_key`),
  ADD KEY `idx_user_presence_org_active` (`organization_id`,`left_at`,`last_seen_at`),
  ADD KEY `idx_user_presence_user_active` (`user_id`,`left_at`,`last_seen_at`);

--
-- Indexes for table `user_reactivation_requests`
--
ALTER TABLE `user_reactivation_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_reactivation_requests_pending_user` (`pending_deleted_user_id`),
  ADD KEY `idx_user_reactivation_requests_queue` (`organization_id`,`status_code`,`requested_at`),
  ADD KEY `idx_user_reactivation_requests_history` (`deleted_user_id`,`requested_at`),
  ADD KEY `idx_user_reactivation_requests_reviewer` (`reviewed_by`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_role_scope` (`user_id`,`role_id`,`business_unit_id`),
  ADD KEY `idx_user_roles_bu` (`business_unit_id`),
  ADD KEY `fk_user_roles_role` (`role_id`),
  ADD KEY `fk_user_roles_assigned_by` (`assigned_by`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_token_hash` (`session_token_hash`),
  ADD UNIQUE KEY `refresh_token_hash` (`refresh_token_hash`),
  ADD KEY `idx_user_sessions_user` (`user_id`,`expires_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `assets`
--
ALTER TABLE `assets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `asset_maintenance_records`
--
ALTER TABLE `asset_maintenance_records`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `asset_project_assignments`
--
ALTER TABLE `asset_project_assignments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=183;

--
-- AUTO_INCREMENT for table `automation_rules`
--
ALTER TABLE `automation_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `automation_runs`
--
ALTER TABLE `automation_runs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `budgets`
--
ALTER TABLE `budgets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `budget_items`
--
ALTER TABLE `budget_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `business_units`
--
ALTER TABLE `business_units`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `calendar_events`
--
ALTER TABLE `calendar_events`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `channel_product_mappings`
--
ALTER TABLE `channel_product_mappings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `craft_orders`
--
ALTER TABLE `craft_orders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `craft_order_drafts`
--
ALTER TABLE `craft_order_drafts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `craft_order_items`
--
ALTER TABLE `craft_order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `craft_order_status_history`
--
ALTER TABLE `craft_order_status_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `design_files`
--
ALTER TABLE `design_files`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `document_templates`
--
ALTER TABLE `document_templates`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `domain_events`
--
ALTER TABLE `domain_events`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `filament_spools`
--
ALTER TABLE `filament_spools`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `financial_periods`
--
ALTER TABLE `financial_periods`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `integrations`
--
ALTER TABLE `integrations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `integration_secrets`
--
ALTER TABLE `integration_secrets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `integration_sync_logs`
--
ALTER TABLE `integration_sync_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `internal_transfers`
--
ALTER TABLE `internal_transfers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_movements`
--
ALTER TABLE `inventory_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_payment_schedules`
--
ALTER TABLE `invoice_payment_schedules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `journal_entries`
--
ALTER TABLE `journal_entries`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `journal_lines`
--
ALTER TABLE `journal_lines`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT for table `login_history`
--
ALTER TABLE `login_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_fee_rules`
--
ALTER TABLE `marketplace_fee_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_settlements`
--
ALTER TABLE `marketplace_settlements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_settlement_items`
--
ALTER TABLE `marketplace_settlement_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `master_options`
--
ALTER TABLE `master_options`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `materials`
--
ALTER TABLE `materials`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_batches`
--
ALTER TABLE `material_batches`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_categories`
--
ALTER TABLE `material_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_waste`
--
ALTER TABLE `material_waste`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `order_attachments`
--
ALTER TABLE `order_attachments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations`
--
ALTER TABLE `organizations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `parties`
--
ALTER TABLE `parties`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `partner_price_rules`
--
ALTER TABLE `partner_price_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `party_contacts`
--
ALTER TABLE `party_contacts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `party_roles`
--
ALTER TABLE `party_roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT for table `printers`
--
ALTER TABLE `printers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `printer_issues`
--
ALTER TABLE `printer_issues`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `printer_maintenance_records`
--
ALTER TABLE `printer_maintenance_records`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `printer_maintenance_schedules`
--
ALTER TABLE `printer_maintenance_schedules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `print_failures`
--
ALTER TABLE `print_failures`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `print_jobs`
--
ALTER TABLE `print_jobs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `print_job_materials`
--
ALTER TABLE `print_job_materials`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `print_job_status_history`
--
ALTER TABLE `print_job_status_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `print_profiles`
--
ALTER TABLE `print_profiles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `production_queue_items`
--
ALTER TABLE `production_queue_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_boms`
--
ALTER TABLE `product_boms`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_bom_items`
--
ALTER TABLE `product_bom_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_categories`
--
ALTER TABLE `product_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project_deliverables`
--
ALTER TABLE `project_deliverables`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project_external_assignments`
--
ALTER TABLE `project_external_assignments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project_milestones`
--
ALTER TABLE `project_milestones`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_requests`
--
ALTER TABLE `purchase_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_request_items`
--
ALTER TABLE `purchase_request_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `qc_inspections`
--
ALTER TABLE `qc_inspections`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `qc_inspection_items`
--
ALTER TABLE `qc_inspection_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `qc_templates`
--
ALTER TABLE `qc_templates`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `qc_template_items`
--
ALTER TABLE `qc_template_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quick_links`
--
ALTER TABLE `quick_links`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quotations`
--
ALTER TABLE `quotations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quotation_items`
--
ALTER TABLE `quotation_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quotation_templates`
--
ALTER TABLE `quotation_templates`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quotation_template_items`
--
ALTER TABLE `quotation_template_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_definitions`
--
ALTER TABLE `report_definitions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_exports`
--
ALTER TABLE `report_exports`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=148;

--
-- AUTO_INCREMENT for table `sales_channels`
--
ALTER TABLE `sales_channels`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_package_items`
--
ALTER TABLE `service_package_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_reservations`
--
ALTER TABLE `stock_reservations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `studio_projects`
--
ALTER TABLE `studio_projects`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `studio_project_services`
--
ALTER TABLE `studio_project_services`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `studio_project_status_history`
--
ALTER TABLE `studio_project_status_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `studio_services`
--
ALTER TABLE `studio_services`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `studio_service_categories`
--
ALTER TABLE `studio_service_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_invoices`
--
ALTER TABLE `supplier_invoices`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transaction_categories`
--
ALTER TABLE `transaction_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `treasury_accounts`
--
ALTER TABLE `treasury_accounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `units_of_measure`
--
ALTER TABLE `units_of_measure`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=396;

--
-- AUTO_INCREMENT for table `user_deletion_requests`
--
ALTER TABLE `user_deletion_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_presence_sessions`
--
ALTER TABLE `user_presence_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=735;

--
-- AUTO_INCREMENT for table `user_reactivation_requests`
--
ALTER TABLE `user_reactivation_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=311;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Structure for view `v_accounts_payable`
--
DROP TABLE IF EXISTS `v_accounts_payable`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_accounts_payable`  AS SELECT `si`.`id` AS `supplier_invoice_id`, `si`.`business_unit_id` AS `business_unit_id`, `si`.`supplier_invoice_number` AS `supplier_invoice_number`, `si`.`supplier_party_id` AS `supplier_party_id`, `p`.`display_name` AS `supplier_name`, `si`.`invoice_date` AS `invoice_date`, `si`.`due_date` AS `due_date`, `si`.`status_code` AS `status_code`, `si`.`total_amount` AS `total_amount`, `si`.`paid_amount` AS `paid_amount`, `si`.`balance_due` AS `balance_due`, (to_days(curdate()) - to_days(`si`.`due_date`)) AS `days_overdue` FROM (`supplier_invoices` `si` join `parties` `p` on((`p`.`id` = `si`.`supplier_party_id`))) WHERE ((`si`.`balance_due` > 0) AND (`si`.`status_code` not in ('void','paid'))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_accounts_receivable`
--
DROP TABLE IF EXISTS `v_accounts_receivable`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_accounts_receivable`  AS SELECT `i`.`id` AS `invoice_id`, `i`.`business_unit_id` AS `business_unit_id`, `i`.`invoice_number` AS `invoice_number`, `i`.`party_id` AS `party_id`, `p`.`display_name` AS `party_name`, `i`.`issue_date` AS `issue_date`, `i`.`due_date` AS `due_date`, `i`.`status_code` AS `status_code`, `i`.`total_amount` AS `total_amount`, `i`.`paid_amount` AS `paid_amount`, `i`.`balance_due` AS `balance_due`, (to_days(curdate()) - to_days(`i`.`due_date`)) AS `days_overdue` FROM (`invoices` `i` join `parties` `p` on((`p`.`id` = `i`.`party_id`))) WHERE ((`i`.`balance_due` > 0) AND (`i`.`status_code` not in ('void','refunded','paid'))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_craft_order_priority`
--
DROP TABLE IF EXISTS `v_craft_order_priority`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_craft_order_priority`  AS SELECT `o`.`id` AS `id`, `o`.`order_code` AS `order_code`, `o`.`customer_party_id` AS `customer_party_id`, `p`.`display_name` AS `customer_name`, `o`.`sales_channel_id` AS `sales_channel_id`, `sc`.`name` AS `sales_channel_name`, `o`.`order_date` AS `order_date`, `o`.`deadline_at` AS `deadline_at`, `o`.`priority_code` AS `priority_code`, `o`.`priority_score` AS `priority_score`, `o`.`status_code` AS `status_code`, `o`.`payment_status_code` AS `payment_status_code`, `o`.`total_amount` AS `total_amount`, timestampdiff(MINUTE,utc_timestamp(),`o`.`deadline_at`) AS `minutes_to_deadline` FROM ((`craft_orders` `o` join `parties` `p` on((`p`.`id` = `o`.`customer_party_id`))) join `sales_channels` `sc` on((`sc`.`id` = `o`.`sales_channel_id`))) WHERE ((`o`.`deleted_at` is null) AND (`o`.`status_code` not in ('completed','cancelled','returned','shipped'))) ORDER BY `o`.`priority_score` DESC, `o`.`deadline_at` ASC, `o`.`order_date` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_material_stock`
--
DROP TABLE IF EXISTS `v_material_stock`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_material_stock`  AS SELECT `m`.`id` AS `material_id`, `m`.`business_unit_id` AS `business_unit_id`, `m`.`sku` AS `sku`, `m`.`name` AS `name`, `m`.`material_type` AS `material_type`, `m`.`color_name` AS `color_name`, `u`.`symbol` AS `unit_symbol`, coalesce(sum(`mb`.`current_qty`),0) AS `total_qty`, coalesce(sum(`mb`.`reserved_qty`),0) AS `reserved_qty`, coalesce(sum((`mb`.`current_qty` - `mb`.`reserved_qty`)),0) AS `available_qty`, `m`.`low_stock_threshold` AS `low_stock_threshold`, (case when (coalesce(sum((`mb`.`current_qty` - `mb`.`reserved_qty`)),0) <= 0) then 'out_of_stock' when (coalesce(sum((`mb`.`current_qty` - `mb`.`reserved_qty`)),0) <= `m`.`low_stock_threshold`) then 'low_stock' else 'normal' end) AS `stock_status` FROM ((`materials` `m` join `units_of_measure` `u` on((`u`.`id` = `m`.`base_unit_id`))) left join `material_batches` `mb` on(((`mb`.`material_id` = `m`.`id`) and (`mb`.`status_code` <> 'closed')))) WHERE (`m`.`deleted_at` is null) GROUP BY `m`.`id`, `m`.`business_unit_id`, `m`.`sku`, `m`.`name`, `m`.`material_type`, `m`.`color_name`, `u`.`symbol`, `m`.`low_stock_threshold` ;

-- --------------------------------------------------------

--
-- Structure for view `v_printer_current_activity`
--
DROP TABLE IF EXISTS `v_printer_current_activity`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_printer_current_activity`  AS SELECT `p`.`id` AS `printer_id`, `p`.`code` AS `printer_code`, `p`.`name` AS `printer_name`, `p`.`status_code` AS `printer_status`, `pj`.`id` AS `print_job_id`, `pj`.`job_code` AS `job_code`, `pj`.`job_name` AS `job_name`, `pj`.`status_code` AS `job_status`, `pj`.`progress_percent` AS `progress_percent`, `pj`.`started_at` AS `started_at`, `pj`.`estimated_finish_at` AS `estimated_finish_at` FROM (`printers` `p` left join `print_jobs` `pj` on(((`pj`.`printer_id` = `p`.`id`) and (`pj`.`status_code` in ('printing','paused'))))) WHERE (`p`.`deleted_at` is null) ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assets`
--
ALTER TABLE `assets`
  ADD CONSTRAINT `fk_assets_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_assets_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `asset_maintenance_records`
--
ALTER TABLE `asset_maintenance_records`
  ADD CONSTRAINT `fk_asset_maintenance_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_asset_maintenance_party` FOREIGN KEY (`performed_by_party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `asset_project_assignments`
--
ALTER TABLE `asset_project_assignments`
  ADD CONSTRAINT `fk_asset_assignment_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  ADD CONSTRAINT `fk_asset_assignment_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_asset_assignment_user` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_logs_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_audit_logs_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `automation_rules`
--
ALTER TABLE `automation_rules`
  ADD CONSTRAINT `fk_automation_rules_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_automation_rules_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_automation_rules_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_automation_rules_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `automation_runs`
--
ALTER TABLE `automation_runs`
  ADD CONSTRAINT `fk_automation_runs_initiated_by` FOREIGN KEY (`initiated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_automation_runs_rule` FOREIGN KEY (`rule_id`) REFERENCES `automation_rules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `budgets`
--
ALTER TABLE `budgets`
  ADD CONSTRAINT `fk_budgets_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_budgets_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_budgets_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_budgets_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `budget_items`
--
ALTER TABLE `budget_items`
  ADD CONSTRAINT `fk_budget_items_budget` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_budget_items_category` FOREIGN KEY (`category_id`) REFERENCES `transaction_categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `business_units`
--
ALTER TABLE `business_units`
  ADD CONSTRAINT `fk_business_units_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `calendar_events`
--
ALTER TABLE `calendar_events`
  ADD CONSTRAINT `fk_calendar_events_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_calendar_events_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_calendar_events_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_calendar_events_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `calendar_event_attendees`
--
ALTER TABLE `calendar_event_attendees`
  ADD CONSTRAINT `fk_calendar_attendees_added_by` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_calendar_attendees_event` FOREIGN KEY (`event_id`) REFERENCES `calendar_events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_calendar_attendees_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `channel_product_mappings`
--
ALTER TABLE `channel_product_mappings`
  ADD CONSTRAINT `fk_channel_product_mapping_channel` FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_channel_product_mapping_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_channel_product_mapping_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  ADD CONSTRAINT `fk_coa_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_coa_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_coa_parent` FOREIGN KEY (`parent_account_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `craft_orders`
--
ALTER TABLE `craft_orders`
  ADD CONSTRAINT `fk_craft_orders_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_craft_orders_channel` FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels` (`id`),
  ADD CONSTRAINT `fk_craft_orders_customer` FOREIGN KEY (`customer_party_id`) REFERENCES `parties` (`id`),
  ADD CONSTRAINT `fk_craft_orders_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `craft_order_drafts`
--
ALTER TABLE `craft_order_drafts`
  ADD CONSTRAINT `fk_craft_order_drafts_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_craft_order_drafts_converted_order` FOREIGN KEY (`converted_order_id`) REFERENCES `craft_orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_craft_order_drafts_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_craft_order_drafts_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `craft_order_items`
--
ALTER TABLE `craft_order_items`
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_order_items_profile` FOREIGN KEY (`print_profile_id`) REFERENCES `print_profiles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_order_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `craft_order_status_history`
--
ALTER TABLE `craft_order_status_history`
  ADD CONSTRAINT `fk_order_status_history_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_order_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `design_files`
--
ALTER TABLE `design_files`
  ADD CONSTRAINT `fk_design_files_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_design_files_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_design_files_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_design_files_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `fk_documents_archived_by` FOREIGN KEY (`archived_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_documents_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_documents_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_documents_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `document_templates`
--
ALTER TABLE `document_templates`
  ADD CONSTRAINT `fk_document_templates_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_document_templates_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_document_templates_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `domain_events`
--
ALTER TABLE `domain_events`
  ADD CONSTRAINT `fk_domain_events_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_domain_events_automation_run` FOREIGN KEY (`source_automation_run_id`) REFERENCES `automation_runs` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_domain_events_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_domain_events_causation` FOREIGN KEY (`causation_event_id`) REFERENCES `domain_events` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_domain_events_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `fk_expenses_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_expenses_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_expenses_category` FOREIGN KEY (`category_id`) REFERENCES `transaction_categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_expenses_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_expenses_order` FOREIGN KEY (`craft_order_id`) REFERENCES `craft_orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_expenses_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_expenses_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_expenses_project` FOREIGN KEY (`studio_project_id`) REFERENCES `studio_projects` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_expenses_transaction` FOREIGN KEY (`financial_transaction_id`) REFERENCES `financial_transactions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_expenses_treasury` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `filament_spools`
--
ALTER TABLE `filament_spools`
  ADD CONSTRAINT `fk_filament_spools_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `financial_periods`
--
ALTER TABLE `financial_periods`
  ADD CONSTRAINT `fk_financial_period_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_financial_period_user` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD CONSTRAINT `fk_fin_transactions_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_fin_transactions_category` FOREIGN KEY (`category_id`) REFERENCES `transaction_categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_fin_transactions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_fin_transactions_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_fin_transactions_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_fin_transactions_posted_by` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_fin_transactions_treasury` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  ADD CONSTRAINT `fk_goods_receipts_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_goods_receipts_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  ADD CONSTRAINT `fk_goods_receipts_user` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  ADD CONSTRAINT `fk_goods_receipt_items_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_goods_receipt_items_po_item` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`id`),
  ADD CONSTRAINT `fk_goods_receipt_items_receipt` FOREIGN KEY (`goods_receipt_id`) REFERENCES `goods_receipts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `integrations`
--
ALTER TABLE `integrations`
  ADD CONSTRAINT `fk_integrations_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_integrations_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_integrations_sales_channel` FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_integrations_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `integration_secrets`
--
ALTER TABLE `integration_secrets`
  ADD CONSTRAINT `fk_integration_secrets_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_integration_secrets_integration` FOREIGN KEY (`integration_id`) REFERENCES `integrations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_integration_secrets_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `integration_sync_logs`
--
ALTER TABLE `integration_sync_logs`
  ADD CONSTRAINT `fk_integration_sync_logs_integration` FOREIGN KEY (`integration_id`) REFERENCES `integrations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `internal_transfers`
--
ALTER TABLE `internal_transfers`
  ADD CONSTRAINT `fk_internal_transfer_from_account` FOREIGN KEY (`from_treasury_account_id`) REFERENCES `treasury_accounts` (`id`),
  ADD CONSTRAINT `fk_internal_transfer_from_bu` FOREIGN KEY (`from_business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_internal_transfer_journal` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_internal_transfer_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_internal_transfer_to_account` FOREIGN KEY (`to_treasury_account_id`) REFERENCES `treasury_accounts` (`id`),
  ADD CONSTRAINT `fk_internal_transfer_to_bu` FOREIGN KEY (`to_business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_internal_transfer_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `inventory_movements`
--
ALTER TABLE `inventory_movements`
  ADD CONSTRAINT `fk_inventory_movement_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_inventory_movement_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_inventory_movement_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  ADD CONSTRAINT `fk_inventory_movement_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`),
  ADD CONSTRAINT `fk_inventory_movement_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_invoices_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_invoices_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_invoices_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`),
  ADD CONSTRAINT `fk_invoices_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_invoices_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_invoice_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_invoice_items_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `invoice_payment_schedules`
--
ALTER TABLE `invoice_payment_schedules`
  ADD CONSTRAINT `fk_invoice_payment_schedule_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD CONSTRAINT `fk_journal_entries_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_journal_entries_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_journal_entries_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_journal_entries_period` FOREIGN KEY (`financial_period_id`) REFERENCES `financial_periods` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_journal_entries_posted_by` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_journal_entries_reversal` FOREIGN KEY (`reversal_of_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_journal_entries_tx` FOREIGN KEY (`source_transaction_id`) REFERENCES `financial_transactions` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `journal_lines`
--
ALTER TABLE `journal_lines`
  ADD CONSTRAINT `fk_journal_lines_coa` FOREIGN KEY (`coa_account_id`) REFERENCES `chart_of_accounts` (`id`),
  ADD CONSTRAINT `fk_journal_lines_entry` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_journal_lines_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `login_history`
--
ALTER TABLE `login_history`
  ADD CONSTRAINT `fk_login_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_fee_rules`
--
ALTER TABLE `marketplace_fee_rules`
  ADD CONSTRAINT `fk_marketplace_fee_channel` FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_settlements`
--
ALTER TABLE `marketplace_settlements`
  ADD CONSTRAINT `fk_marketplace_settlement_channel` FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels` (`id`),
  ADD CONSTRAINT `fk_marketplace_settlement_fin_tx` FOREIGN KEY (`financial_transaction_id`) REFERENCES `financial_transactions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_marketplace_settlement_treasury` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_settlement_items`
--
ALTER TABLE `marketplace_settlement_items`
  ADD CONSTRAINT `fk_marketplace_settlement_items_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_marketplace_settlement_items_settlement` FOREIGN KEY (`settlement_id`) REFERENCES `marketplace_settlements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `master_options`
--
ALTER TABLE `master_options`
  ADD CONSTRAINT `fk_master_options_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `materials`
--
ALTER TABLE `materials`
  ADD CONSTRAINT `fk_materials_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_materials_category` FOREIGN KEY (`category_id`) REFERENCES `material_categories` (`id`),
  ADD CONSTRAINT `fk_materials_supplier` FOREIGN KEY (`preferred_supplier_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_materials_unit` FOREIGN KEY (`base_unit_id`) REFERENCES `units_of_measure` (`id`);

--
-- Constraints for table `material_batches`
--
ALTER TABLE `material_batches`
  ADD CONSTRAINT `fk_material_batches_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  ADD CONSTRAINT `fk_material_batches_purchase_order_item` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_material_batches_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `material_categories`
--
ALTER TABLE `material_categories`
  ADD CONSTRAINT `fk_material_categories_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`);

--
-- Constraints for table `material_waste`
--
ALTER TABLE `material_waste`
  ADD CONSTRAINT `fk_material_waste_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_material_waste_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  ADD CONSTRAINT `fk_material_waste_print_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_material_waste_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`),
  ADD CONSTRAINT `fk_material_waste_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notifications_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `order_attachments`
--
ALTER TABLE `order_attachments`
  ADD CONSTRAINT `fk_order_attachments_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_order_attachments_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `parties`
--
ALTER TABLE `parties`
  ADD CONSTRAINT `fk_parties_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `partner_price_rules`
--
ALTER TABLE `partner_price_rules`
  ADD CONSTRAINT `fk_partner_price_party` FOREIGN KEY (`partner_party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_partner_price_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_partner_price_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `party_contacts`
--
ALTER TABLE `party_contacts`
  ADD CONSTRAINT `fk_party_contacts_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `party_roles`
--
ALTER TABLE `party_roles`
  ADD CONSTRAINT `fk_party_roles_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_party_roles_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_payments_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_payments_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_payments_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_payments_received_by` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_payments_schedule` FOREIGN KEY (`payment_schedule_id`) REFERENCES `invoice_payment_schedules` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_payments_supplier_invoice` FOREIGN KEY (`supplier_invoice_id`) REFERENCES `supplier_invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_payments_transaction` FOREIGN KEY (`financial_transaction_id`) REFERENCES `financial_transactions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_payments_treasury` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `printers`
--
ALTER TABLE `printers`
  ADD CONSTRAINT `fk_printers_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`);

--
-- Constraints for table `printer_issues`
--
ALTER TABLE `printer_issues`
  ADD CONSTRAINT `fk_printer_issues_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_printer_issues_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_printer_issues_reported_by` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `printer_maintenance_records`
--
ALTER TABLE `printer_maintenance_records`
  ADD CONSTRAINT `fk_printer_maintenance_record_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_printer_maintenance_record_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `printer_maintenance_schedules` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_printer_maintenance_record_user` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `printer_maintenance_schedules`
--
ALTER TABLE `printer_maintenance_schedules`
  ADD CONSTRAINT `fk_printer_maintenance_schedule` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `print_failures`
--
ALTER TABLE `print_failures`
  ADD CONSTRAINT `fk_print_failures_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_print_failures_reprint` FOREIGN KEY (`reprint_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_failures_user` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `print_jobs`
--
ALTER TABLE `print_jobs`
  ADD CONSTRAINT `fk_print_jobs_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_print_jobs_design` FOREIGN KEY (`design_file_id`) REFERENCES `design_files` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_jobs_operator` FOREIGN KEY (`operator_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_jobs_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_jobs_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `craft_order_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_jobs_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`),
  ADD CONSTRAINT `fk_print_jobs_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_jobs_profile` FOREIGN KEY (`print_profile_id`) REFERENCES `print_profiles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_jobs_queue` FOREIGN KEY (`queue_item_id`) REFERENCES `production_queue_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_jobs_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `print_job_materials`
--
ALTER TABLE `print_job_materials`
  ADD CONSTRAINT `fk_print_job_material_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_job_material_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_print_job_material_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  ADD CONSTRAINT `fk_print_job_material_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `stock_reservations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_job_material_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`);

--
-- Constraints for table `print_job_status_history`
--
ALTER TABLE `print_job_status_history`
  ADD CONSTRAINT `fk_print_job_history_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_print_job_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `print_profiles`
--
ALTER TABLE `print_profiles`
  ADD CONSTRAINT `fk_print_profiles_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_print_profiles_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_profiles_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_profiles_unit` FOREIGN KEY (`estimated_material_unit_id`) REFERENCES `units_of_measure` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_print_profiles_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `production_queue_items`
--
ALTER TABLE `production_queue_items`
  ADD CONSTRAINT `fk_production_queue_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_production_queue_item` FOREIGN KEY (`order_item_id`) REFERENCES `craft_order_items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_production_queue_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_production_queue_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `product_boms`
--
ALTER TABLE `product_boms`
  ADD CONSTRAINT `fk_product_boms_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_boms_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_bom_items`
--
ALTER TABLE `product_bom_items`
  ADD CONSTRAINT `fk_product_bom_items_bom` FOREIGN KEY (`bom_id`) REFERENCES `product_boms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_bom_items_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  ADD CONSTRAINT `fk_product_bom_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`);

--
-- Constraints for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD CONSTRAINT `fk_product_categories_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_product_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `fk_product_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_deliverables`
--
ALTER TABLE `project_deliverables`
  ADD CONSTRAINT `fk_project_deliverables_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `project_milestones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_project_deliverables_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_external_assignments`
--
ALTER TABLE `project_external_assignments`
  ADD CONSTRAINT `fk_project_external_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`),
  ADD CONSTRAINT `fk_project_external_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_milestones`
--
ALTER TABLE `project_milestones`
  ADD CONSTRAINT `fk_project_milestones_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `fk_purchase_orders_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_purchase_orders_request` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_purchase_orders_supplier` FOREIGN KEY (`supplier_party_id`) REFERENCES `parties` (`id`),
  ADD CONSTRAINT `fk_purchase_orders_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `fk_purchase_order_items_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_purchase_order_items_order` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_purchase_order_items_request_item` FOREIGN KEY (`purchase_request_item_id`) REFERENCES `purchase_request_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_purchase_order_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchase_requests`
--
ALTER TABLE `purchase_requests`
  ADD CONSTRAINT `fk_purchase_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_purchase_requests_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_purchase_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchase_request_items`
--
ALTER TABLE `purchase_request_items`
  ADD CONSTRAINT `fk_purchase_request_items_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_purchase_request_items_request` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_purchase_request_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `qc_inspections`
--
ALTER TABLE `qc_inspections`
  ADD CONSTRAINT `fk_qc_inspections_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_qc_inspections_template` FOREIGN KEY (`template_id`) REFERENCES `qc_templates` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_qc_inspections_user` FOREIGN KEY (`inspector_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `qc_inspection_items`
--
ALTER TABLE `qc_inspection_items`
  ADD CONSTRAINT `fk_qc_inspection_items_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `qc_inspections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_qc_inspection_items_template_item` FOREIGN KEY (`template_item_id`) REFERENCES `qc_template_items` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `qc_templates`
--
ALTER TABLE `qc_templates`
  ADD CONSTRAINT `fk_qc_templates_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`);

--
-- Constraints for table `qc_template_items`
--
ALTER TABLE `qc_template_items`
  ADD CONSTRAINT `fk_qc_template_items_template` FOREIGN KEY (`template_id`) REFERENCES `qc_templates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quick_links`
--
ALTER TABLE `quick_links`
  ADD CONSTRAINT `fk_quick_links_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_quick_links_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `quotations`
--
ALTER TABLE `quotations`
  ADD CONSTRAINT `fk_quotations_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_quotations_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_quotations_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_quotations_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`),
  ADD CONSTRAINT `fk_quotations_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_quotations_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `quotation_items`
--
ALTER TABLE `quotation_items`
  ADD CONSTRAINT `fk_quotation_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_quotation_items_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_quotation_items_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `quotation_templates`
--
ALTER TABLE `quotation_templates`
  ADD CONSTRAINT `fk_quotation_templates_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_quotation_templates_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_quotation_templates_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `quotation_template_items`
--
ALTER TABLE `quotation_template_items`
  ADD CONSTRAINT `fk_quotation_template_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_quotation_template_items_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_quotation_template_items_template` FOREIGN KEY (`template_id`) REFERENCES `quotation_templates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `report_definitions`
--
ALTER TABLE `report_definitions`
  ADD CONSTRAINT `fk_report_definitions_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_report_definitions_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_report_definitions_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `report_exports`
--
ALTER TABLE `report_exports`
  ADD CONSTRAINT `fk_report_exports_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_report_exports_definition` FOREIGN KEY (`report_definition_id`) REFERENCES `report_definitions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_report_exports_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_report_exports_user` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `fk_roles_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sales_channels`
--
ALTER TABLE `sales_channels`
  ADD CONSTRAINT `fk_sales_channels_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`);

--
-- Constraints for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD CONSTRAINT `fk_service_packages_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`);

--
-- Constraints for table `service_package_items`
--
ALTER TABLE `service_package_items`
  ADD CONSTRAINT `fk_service_package_items_package` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_service_package_items_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`);

--
-- Constraints for table `stock_reservations`
--
ALTER TABLE `stock_reservations`
  ADD CONSTRAINT `fk_stock_reservation_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stock_reservation_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  ADD CONSTRAINT `fk_stock_reservation_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`),
  ADD CONSTRAINT `fk_stock_reservation_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `studio_projects`
--
ALTER TABLE `studio_projects`
  ADD CONSTRAINT `fk_studio_projects_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_studio_projects_client` FOREIGN KEY (`client_party_id`) REFERENCES `parties` (`id`),
  ADD CONSTRAINT `fk_studio_projects_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_studio_projects_pm` FOREIGN KEY (`project_manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `studio_project_members`
--
ALTER TABLE `studio_project_members`
  ADD CONSTRAINT `fk_project_members_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `studio_project_services`
--
ALTER TABLE `studio_project_services`
  ADD CONSTRAINT `fk_project_services_package` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_project_services_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_services_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `studio_project_status_history`
--
ALTER TABLE `studio_project_status_history`
  ADD CONSTRAINT `fk_project_status_history_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `studio_services`
--
ALTER TABLE `studio_services`
  ADD CONSTRAINT `fk_studio_services_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_studio_services_category` FOREIGN KEY (`category_id`) REFERENCES `studio_service_categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `studio_service_categories`
--
ALTER TABLE `studio_service_categories`
  ADD CONSTRAINT `fk_studio_service_category_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`);

--
-- Constraints for table `supplier_invoices`
--
ALTER TABLE `supplier_invoices`
  ADD CONSTRAINT `fk_supplier_invoices_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_supplier_invoices_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_supplier_invoices_supplier` FOREIGN KEY (`supplier_party_id`) REFERENCES `parties` (`id`);

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `fk_system_settings_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  ADD CONSTRAINT `fk_system_settings_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_system_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_tasks_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_tasks_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `task_assignees`
--
ALTER TABLE `task_assignees`
  ADD CONSTRAINT `fk_task_assignees_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_task_assignees_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_task_assignees_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transaction_categories`
--
ALTER TABLE `transaction_categories`
  ADD CONSTRAINT `fk_transaction_categories_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_transaction_categories_coa` FOREIGN KEY (`default_coa_account_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transaction_categories_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `treasury_accounts`
--
ALTER TABLE `treasury_accounts`
  ADD CONSTRAINT `fk_treasury_accounts_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_treasury_accounts_coa` FOREIGN KEY (`coa_account_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_treasury_accounts_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_users_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_users_rejected_by` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_business_units`
--
ALTER TABLE `user_business_units`
  ADD CONSTRAINT `fk_user_bu_unit` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_bu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_deletion_requests`
--
ALTER TABLE `user_deletion_requests`
  ADD CONSTRAINT `fk_user_deletion_requests_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_user_deletion_requests_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_user_deletion_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `user_presence_sessions`
--
ALTER TABLE `user_presence_sessions`
  ADD CONSTRAINT `fk_user_presence_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_presence_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_reactivation_requests`
--
ALTER TABLE `user_reactivation_requests`
  ADD CONSTRAINT `fk_user_reactivation_requests_deleted_user` FOREIGN KEY (`deleted_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_user_reactivation_requests_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_user_reactivation_requests_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `fk_user_roles_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_user_roles_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
