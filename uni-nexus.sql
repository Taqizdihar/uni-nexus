-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 27, 2026 at 05:21 AM
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
(1, 1, NULL, 2, 'users', 'bootstrap_cto', NULL, NULL, NULL, 'CTO bootstrap registration', NULL, NULL, NULL, NULL, '2026-08-23 10:07:06.561'),
(2, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-23 10:07:06.685'),
(3, 1, NULL, 3, 'users', 'signup_request', NULL, NULL, NULL, 'User signup request', NULL, NULL, NULL, NULL, '2026-08-23 10:14:08.002'),
(4, 1, NULL, 4, 'users', 'signup_request', NULL, NULL, NULL, 'User signup request', NULL, NULL, NULL, NULL, '2026-08-23 10:14:40.764'),
(5, 1, NULL, 5, 'users', 'signup_request', NULL, NULL, NULL, 'User signup request', NULL, NULL, NULL, NULL, '2026-08-23 10:16:56.534'),
(6, 1, NULL, 6, 'users', 'signup_request', NULL, NULL, NULL, 'User signup request', NULL, NULL, NULL, NULL, '2026-08-23 10:17:33.382'),
(7, 1, NULL, 7, 'users', 'signup_request', NULL, NULL, NULL, 'User signup request', NULL, NULL, NULL, NULL, '2026-08-23 10:18:10.987'),
(8, 1, NULL, 8, 'users', 'signup_request', NULL, NULL, NULL, 'User signup request', NULL, NULL, NULL, NULL, '2026-08-23 10:19:35.786'),
(9, 1, NULL, 9, 'users', 'signup_request', NULL, NULL, NULL, 'User signup request', NULL, NULL, NULL, NULL, '2026-08-23 10:20:05.570'),
(10, 1, NULL, 10, 'users', 'signup_request', NULL, NULL, NULL, 'User signup request', NULL, NULL, NULL, NULL, '2026-08-23 10:20:42.457'),
(11, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-23 10:20:58.004'),
(12, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-23 10:49:25.735'),
(13, 1, NULL, 2, 'users', 'approval', NULL, NULL, NULL, 'Account approved', NULL, NULL, NULL, NULL, '2026-08-23 10:49:37.878'),
(14, 1, NULL, 2, 'users', 'approval', NULL, NULL, NULL, 'Account approved', NULL, NULL, NULL, NULL, '2026-08-23 10:49:42.820'),
(15, 1, NULL, 2, 'users', 'approval', NULL, NULL, NULL, 'Account approved', NULL, NULL, NULL, NULL, '2026-08-23 10:49:46.828'),
(16, 1, NULL, 2, 'users', 'approval', NULL, NULL, NULL, 'Account approved', NULL, NULL, NULL, NULL, '2026-08-23 10:49:50.874'),
(17, 1, NULL, 2, 'users', 'approval', NULL, NULL, NULL, 'Account approved', NULL, NULL, NULL, NULL, '2026-08-23 10:49:54.451'),
(18, 1, NULL, 2, 'users', 'approval', NULL, NULL, NULL, 'Account approved', NULL, NULL, NULL, NULL, '2026-08-23 10:50:00.352'),
(19, 1, NULL, 2, 'users', 'approval', NULL, NULL, NULL, 'Account approved', NULL, NULL, NULL, NULL, '2026-08-23 10:50:05.939'),
(20, 1, NULL, 2, 'users', 'approval', NULL, NULL, NULL, 'Account approved', NULL, NULL, NULL, NULL, '2026-08-23 10:50:09.754'),
(21, 1, NULL, 4, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-23 11:10:35.707'),
(22, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-23 11:11:21.839'),
(23, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-24 08:59:59.566'),
(24, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-24 11:09:29.177'),
(25, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-24 11:20:14.128'),
(26, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-24 13:13:02.671'),
(36, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-24 16:37:53.371'),
(37, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-26 12:43:10.251'),
(38, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-26 13:34:08.983'),
(39, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-26 14:15:24.284'),
(40, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-26 18:25:06.723'),
(41, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-26 19:38:37.190'),
(42, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 07:45:57.293'),
(43, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 08:04:48.933'),
(44, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 08:47:23.797'),
(45, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 10:10:33.483'),
(46, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 10:16:51.338'),
(47, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 10:29:55.606'),
(48, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 10:59:02.700'),
(49, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 12:17:47.926');

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
  `title` varchar(220) NOT NULL,
  `description` text,
  `event_type` varchar(50) NOT NULL COMMENT 'order_deadline|production|project_deadline|maintenance|payment|meeting|task|other',
  `start_at` datetime(3) NOT NULL,
  `end_at` datetime(3) DEFAULT NULL,
  `all_day` tinyint(1) NOT NULL DEFAULT '0',
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint UNSIGNED DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
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
(1, 1, NULL, '1000', 'Kas dan Setara Kas', 'asset', 'debit', NULL, 1, 1, '2026-08-22 07:48:09.761'),
(2, 1, NULL, '1100', 'Piutang Usaha', 'asset', 'debit', NULL, 1, 1, '2026-08-22 07:48:09.761'),
(3, 1, NULL, '1200', 'Persediaan Material', 'asset', 'debit', NULL, 1, 1, '2026-08-22 07:48:09.761'),
(4, 1, NULL, '1300', 'Aset Tetap', 'asset', 'debit', NULL, 1, 1, '2026-08-22 07:48:09.761'),
(5, 1, NULL, '2000', 'Utang Usaha', 'liability', 'credit', NULL, 1, 1, '2026-08-22 07:48:09.761'),
(6, 1, NULL, '2100', 'Utang Lain-lain', 'liability', 'credit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(7, 1, NULL, '3000', 'Modal / Ekuitas', 'equity', 'credit', NULL, 1, 1, '2026-08-22 07:48:09.761'),
(8, 1, NULL, '4000', 'Pendapatan Craft', 'revenue', 'credit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(9, 1, NULL, '4100', 'Pendapatan Studio', 'revenue', 'credit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(10, 1, NULL, '4200', 'Pendapatan Lain-lain', 'revenue', 'credit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(11, 1, NULL, '5000', 'Harga Pokok Produksi Craft', 'expense', 'debit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(12, 1, NULL, '5100', 'Biaya Material', 'expense', 'debit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(13, 1, NULL, '5200', 'Biaya Marketplace', 'expense', 'debit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(14, 1, NULL, '5300', 'Biaya Listrik dan Produksi', 'expense', 'debit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(15, 1, NULL, '5400', 'Biaya Proyek Studio', 'expense', 'debit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(16, 1, NULL, '5500', 'Biaya Operasional Umum', 'expense', 'debit', NULL, 0, 1, '2026-08-22 07:48:09.761'),
(17, 1, NULL, '5600', 'Biaya Perawatan', 'expense', 'debit', NULL, 0, 1, '2026-08-22 07:48:09.761');

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
  `title` varchar(220) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `file_size_bytes` bigint UNSIGNED DEFAULT NULL,
  `entity_type` varchar(60) DEFAULT NULL,
  `entity_id` bigint UNSIGNED DEFAULT NULL,
  `version_no` int UNSIGNED NOT NULL DEFAULT '1',
  `is_template` tinyint(1) NOT NULL DEFAULT '0',
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

--
-- Dumping data for table `master_options`
--

INSERT INTO `master_options` (`id`, `organization_id`, `group_key`, `code`, `label`, `sort_order`, `metadata`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'order_status', 'new', 'Baru', 10, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(2, 1, 'order_status', 'confirmed', 'Dikonfirmasi', 20, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(3, 1, 'order_status', 'waiting', 'Menunggu', 30, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(4, 1, 'order_status', 'ready', 'Siap Diproduksi', 40, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(5, 1, 'order_status', 'in_production', 'Sedang Diproduksi', 50, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(6, 1, 'order_status', 'qc', 'Kontrol Kualitas', 60, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(7, 1, 'order_status', 'completed', 'Selesai', 70, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(8, 1, 'order_status', 'packed', 'Dikemas', 80, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(9, 1, 'order_status', 'shipped', 'Dikirim', 90, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(10, 1, 'order_status', 'cancelled', 'Dibatalkan', 100, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(11, 1, 'order_status', 'returned', 'Dikembalikan', 110, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(12, 1, 'priority', 'low', 'Rendah', 10, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(13, 1, 'priority', 'normal', 'Normal', 20, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(14, 1, 'priority', 'high', 'Tinggi', 30, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(15, 1, 'priority', 'critical', 'Kritis', 40, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(16, 1, 'payment_status', 'unpaid', 'Belum Lunas', 10, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(17, 1, 'payment_status', 'partial', 'Sebagian', 20, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(18, 1, 'payment_status', 'paid', 'Lunas', 30, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(19, 1, 'payment_status', 'refunded', 'Dikembalikan', 40, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(20, 1, 'printer_status', 'available', 'Tersedia', 10, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(21, 1, 'printer_status', 'busy', 'Sedang Digunakan', 20, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(22, 1, 'printer_status', 'maintenance', 'Perawatan', 30, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(23, 1, 'printer_status', 'error', 'Error', 40, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(24, 1, 'printer_status', 'offline', 'Offline', 50, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(25, 1, 'project_status', 'lead', 'Prospek', 10, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(26, 1, 'project_status', 'quotation', 'Penawaran', 20, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(27, 1, 'project_status', 'approved', 'Disetujui', 30, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(28, 1, 'project_status', 'in_progress', 'Sedang Dikerjakan', 40, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(29, 1, 'project_status', 'review', 'Tinjauan', 50, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(30, 1, 'project_status', 'completed', 'Selesai', 60, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(31, 1, 'project_status', 'paid', 'Lunas', 70, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775'),
(32, 1, 'project_status', 'cancelled', 'Dibatalkan', 80, NULL, 1, '2026-08-22 07:48:09.775', '2026-08-22 07:48:09.775');

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

--
-- Dumping data for table `material_categories`
--

INSERT INTO `material_categories` (`id`, `business_unit_id`, `code`, `name`, `category_type`, `is_active`) VALUES
(1, 1, 'FILAMENT', 'Filament', 'filament', 1),
(2, 1, 'RESIN', 'Resin', 'resin', 1),
(3, 1, 'HARDWARE', 'Komponen / Hardware', 'hardware', 1),
(4, 1, 'PACKAGING', 'Kemasan', 'packaging', 1),
(5, 1, 'CONSUMABLE', 'Consumable', 'consumable', 1),
(6, 1, 'OTHER', 'Lainnya', 'other', 1);

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
  `severity_code` varchar(20) NOT NULL DEFAULT 'info' COMMENT 'info|success|warning|error|critical',
  `title` varchar(180) NOT NULL,
  `message` text NOT NULL,
  `action_url` varchar(500) DEFAULT NULL,
  `entity_type` varchar(60) DEFAULT NULL,
  `entity_id` bigint UNSIGNED DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
(1, 'UNI-INSIDE', 'Uni-Inside Studio', 'Uni-Inside Studio', NULL, NULL, NULL, NULL, NULL, NULL, 'ID', 'IDR', 'Asia/Jakarta', NULL, 1, '2026-08-22 07:48:09.689', '2026-08-22 07:48:09.689');

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

--
-- Dumping data for table `parties`
--

INSERT INTO `parties` (`id`, `organization_id`, `code`, `party_kind`, `display_name`, `legal_name`, `email`, `phone`, `website`, `tax_id`, `address_line1`, `address_line2`, `city`, `province`, `postal_code`, `country_code`, `notes`, `status_code`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'CUS-000001', 'company', 'PT Arunika Kreasi', NULL, 'arunika.test@example.com', '081234567890', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ID', NULL, 'active', '2026-08-24 13:43:06.511', '2026-08-24 13:43:06.515', NULL);

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

--
-- Dumping data for table `party_roles`
--

INSERT INTO `party_roles` (`id`, `party_id`, `business_unit_id`, `role_code`, `is_active`, `valid_from`, `valid_until`, `created_at`) VALUES
(1, 1, 1, 'craft_customer', 1, NULL, NULL, '2026-08-24 13:43:06.517');

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

--
-- Dumping data for table `payment_methods`
--

INSERT INTO `payment_methods` (`id`, `code`, `name`, `method_type`, `is_active`, `created_at`) VALUES
(1, 'CASH', 'Tunai', 'cash', 1, '2026-08-22 07:48:09.712'),
(2, 'BANK_TRANSFER', 'Transfer Bank', 'bank_transfer', 1, '2026-08-22 07:48:09.712'),
(3, 'EWALLET', 'E-Wallet', 'ewallet', 1, '2026-08-22 07:48:09.712'),
(4, 'MARKETPLACE', 'Saldo Marketplace', 'marketplace', 1, '2026-08-22 07:48:09.712'),
(5, 'OTHER', 'Lainnya', 'other', 1, '2026-08-22 07:48:09.712');

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
(37, 'craft.automations.run', 'craft_automations', 'Jalankan Otomasi Craft', 'Menguji dan menjalankan aturan otomasi Uni-Inside Craft secara manual.', '2026-08-27 11:21:01.802');

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

--
-- Dumping data for table `printers`
--

INSERT INTO `printers` (`id`, `business_unit_id`, `code`, `name`, `brand`, `model`, `serial_number`, `printer_type`, `nozzle_diameter_mm`, `build_volume_x_mm`, `build_volume_y_mm`, `build_volume_z_mm`, `status_code`, `location_name`, `purchase_date`, `purchase_cost`, `warranty_until`, `total_print_hours`, `notes`, `is_active`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'PRN-001', 'Anycubic Kobra X', 'Anycubic', 'Kobra X', NULL, 'FDM', 0.400, NULL, NULL, NULL, 'available', NULL, NULL, NULL, NULL, 0.00, NULL, 1, '2026-08-22 07:48:09.752', '2026-08-22 07:48:09.752', NULL);

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

--
-- Dumping data for table `report_definitions`
--

INSERT INTO `report_definitions` (`id`, `organization_id`, `business_unit_id`, `report_code`, `name`, `report_type`, `config_json`, `is_custom`, `is_active`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'CRAFT_ANALYTICS_OVERVIEW', 'Ringkasan Analitik Craft', 'overview', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"overview\"}', 0, 1, NULL, '2026-08-27 09:20:17.190', '2026-08-27 09:20:17.190'),
(2, 1, 1, 'CRAFT_SALES_ANALYTICS', 'Analitik Penjualan', 'sales', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"sales\"}', 0, 1, NULL, '2026-08-27 09:20:18.222', '2026-08-27 09:20:18.222'),
(3, 1, 1, 'CRAFT_ORDER_ANALYTICS', 'Analitik Pesanan', 'orders', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"orders\"}', 0, 1, NULL, '2026-08-27 09:20:18.247', '2026-08-27 09:20:18.247'),
(4, 1, 1, 'CRAFT_PRODUCT_ANALYTICS', 'Analitik Produk', 'products', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"products\"}', 0, 1, NULL, '2026-08-27 09:20:18.333', '2026-08-27 09:20:18.333'),
(5, 1, 1, 'CRAFT_CHANNEL_ANALYTICS', 'Analitik Kanal Penjualan', 'channels', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"channels\"}', 0, 1, NULL, '2026-08-27 09:20:18.358', '2026-08-27 09:20:18.358'),
(6, 1, 1, 'CRAFT_CUSTOMER_ANALYTICS', 'Analitik Pelanggan & Mitra', 'customers', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"customers\"}', 0, 1, NULL, '2026-08-27 09:20:18.381', '2026-08-27 09:20:18.381'),
(7, 1, 1, 'CRAFT_PRODUCTION_ANALYTICS', 'Analitik Produksi', 'production', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"production\"}', 0, 1, NULL, '2026-08-27 09:20:18.407', '2026-08-27 09:20:18.407'),
(8, 1, 1, 'CRAFT_PRINTER_ANALYTICS', 'Analitik Printer', 'printers', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"printers\"}', 0, 1, NULL, '2026-08-27 09:20:18.432', '2026-08-27 09:20:18.432'),
(9, 1, 1, 'CRAFT_MATERIAL_ANALYTICS', 'Analitik Material', 'materials', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"materials\"}', 0, 1, NULL, '2026-08-27 09:20:18.459', '2026-08-27 09:20:18.459'),
(10, 1, 1, 'CRAFT_PROCUREMENT_ANALYTICS', 'Analitik Pengadaan', 'procurement', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"procurement\"}', 0, 1, NULL, '2026-08-27 09:20:18.482', '2026-08-27 09:20:18.482'),
(11, 1, 1, 'CRAFT_PROFITABILITY_ANALYTICS', 'Analitik Profitabilitas', 'profitability', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"profitability\"}', 0, 1, NULL, '2026-08-27 09:20:18.504', '2026-08-27 09:20:18.504');

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
(7, 1, 'OPERATOR', 'Operator', 'Operator internal Uni-Inside.', 'global', 1, 1, '2026-08-23 09:54:06.704', '2026-08-23 09:54:06.704'),
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
(8, 37, '2026-08-27 11:21:01.831');

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

--
-- Dumping data for table `sales_channels`
--

INSERT INTO `sales_channels` (`id`, `business_unit_id`, `code`, `name`, `channel_type`, `external_url`, `is_integrated`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'SHOPEE', 'Shopee', 'marketplace', NULL, 0, 1, '2026-08-22 07:48:09.743', '2026-08-22 07:48:09.743'),
(2, 1, 'TIKTOK_SHOP', 'TikTok Shop', 'marketplace', NULL, 0, 1, '2026-08-22 07:48:09.743', '2026-08-22 07:48:09.743'),
(3, 1, 'TOKOPEDIA', 'Tokopedia', 'marketplace', NULL, 0, 1, '2026-08-22 07:48:09.743', '2026-08-22 07:48:09.743'),
(4, 1, 'DIRECT', 'Pesanan Langsung', 'direct', NULL, 0, 1, '2026-08-22 07:48:09.743', '2026-08-22 07:48:09.743'),
(5, 1, 'PARTNER', 'Pesanan Mitra', 'partner', NULL, 0, 1, '2026-08-22 07:48:09.743', '2026-08-22 07:48:09.743'),
(6, 1, 'INTERNAL', 'Pesanan Internal', 'internal', NULL, 0, 1, '2026-08-22 07:48:09.743', '2026-08-22 07:48:09.743');

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

--
-- Dumping data for table `studio_service_categories`
--

INSERT INTO `studio_service_categories` (`id`, `business_unit_id`, `code`, `name`, `is_active`) VALUES
(1, 2, 'PHOTOGRAPHY', 'Fotografi', 1),
(2, 2, 'VIDEOGRAPHY', 'Videografi', 1),
(3, 2, 'VIDEO_EDITING', 'Editing Video', 1),
(4, 2, 'GRAPHIC_DESIGN', 'Desain Grafis', 1),
(5, 2, 'WEB', 'Pengembangan Web / Landing Page', 1),
(6, 2, 'SOCIAL_MEDIA', 'Media Sosial', 1),
(7, 2, 'MARKETING', 'Pemasaran', 1),
(8, 2, 'EVENT', 'Dokumentasi Acara', 1),
(9, 2, 'OTHER', 'Lainnya', 1);

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
  `setting_group` varchar(80) NOT NULL,
  `setting_key` varchar(120) NOT NULL,
  `setting_value` json DEFAULT NULL,
  `is_secret` tinyint(1) NOT NULL DEFAULT '0',
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  `due_at` datetime(3) DEFAULT NULL,
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint UNSIGNED DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `completed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_assignees`
--

CREATE TABLE `task_assignees` (
  `task_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
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

--
-- Dumping data for table `transaction_categories`
--

INSERT INTO `transaction_categories` (`id`, `organization_id`, `business_unit_id`, `code`, `name`, `transaction_type`, `default_coa_account_id`, `is_active`) VALUES
(1, 1, 1, 'CRAFT_SALES', 'Penjualan Craft', 'income', 8, 1),
(2, 1, 1, 'CRAFT_MATERIAL', 'Pembelian Material Craft', 'expense', 12, 1),
(3, 1, 1, 'CRAFT_MARKETPLACE_FEE', 'Biaya Marketplace', 'expense', 13, 1),
(4, 1, 1, 'CRAFT_PRODUCTION', 'Biaya Produksi Craft', 'expense', 14, 1),
(5, 1, 1, 'CRAFT_MAINTENANCE', 'Perawatan Printer', 'expense', 17, 1),
(6, 1, 3, 'SHARED_OPERATING', 'Biaya Operasional Umum', 'expense', 16, 1),
(7, 1, 2, 'STUDIO_PROJECT', 'Pendapatan Proyek Studio', 'income', 9, 1),
(8, 1, 2, 'STUDIO_PROJECT_COST', 'Biaya Proyek Studio', 'expense', 15, 1);

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

--
-- Dumping data for table `units_of_measure`
--

INSERT INTO `units_of_measure` (`id`, `code`, `name`, `symbol`, `unit_group`, `decimal_places`, `is_active`) VALUES
(1, 'G', 'Gram', 'g', 'weight', 3, 1),
(2, 'KG', 'Kilogram', 'kg', 'weight', 3, 1),
(3, 'PCS', 'Pieces', 'pcs', 'count', 0, 1),
(4, 'ML', 'Mililiter', 'ml', 'volume', 2, 1),
(5, 'M', 'Meter', 'm', 'length', 3, 1),
(6, 'HOUR', 'Jam', 'jam', 'time', 2, 1);

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
  `status_code` varchar(30) NOT NULL DEFAULT 'inactive' COMMENT 'active|inactive|suspended',
  `approval_status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|approved|rejected',
  `registration_source` varchar(30) NOT NULL DEFAULT 'self_signup' COMMENT 'self_signup|admin_created|bootstrap|legacy',
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

INSERT INTO `users` (`id`, `organization_id`, `employee_code`, `full_name`, `username`, `email`, `password_hash`, `phone`, `avatar_path`, `status_code`, `approval_status_code`, `registration_source`, `approval_requested_at`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`, `default_workspace_code`, `email_verified_at`, `last_login_at`, `password_changed_at`, `must_change_password`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, NULL, 'Jane Doe', 'janedoe', 'jane@example.com', '$2b$10$Vi0qAbt2L/TLkN4fmHH.6.IRpR16bcOmjqE/8aiNW5HnSCAfqKakK', NULL, NULL, 'inactive', 'approved', 'legacy', '2026-08-22 15:30:29.057', NULL, '2026-08-22 15:30:29.057', NULL, NULL, NULL, 'craft', NULL, '2026-08-22 15:32:10.679', NULL, 0, '2026-08-22 15:30:29.057', '2026-08-23 09:54:23.987', '2026-08-23 09:54:23.987'),
(2, 1, NULL, 'Muhammad Taqi Izdihar', 'taqizdihar', 'm.taqizdihar@gmail.com', '$2b$10$FBvL5LNb8H8BCzDQMv/Hnul/muHkH7PvDe3AV0h7KKHqjfGmK2nj6', NULL, NULL, 'active', 'approved', 'bootstrap', '2026-08-23 10:07:06.542', NULL, '2026-08-23 10:07:06.542', NULL, NULL, NULL, 'craft', NULL, '2026-08-27 12:17:47.919', NULL, 0, '2026-08-23 10:07:06.542', '2026-08-27 12:17:47.919', NULL),
(3, 1, NULL, 'April Adzania', 'apriladzania', 'april.adzania@gmail.com', '$2b$10$RBpHzttXQPDNvppR6Xgq6ehLMxyYZ2f4GNiGNIIDZeXXN8OajzZXe', NULL, NULL, 'active', 'approved', 'self_signup', '2026-08-23 10:14:08.000', 2, '2026-08-23 10:50:09.750', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:14:08.000', '2026-08-23 10:50:09.750', NULL),
(4, 1, NULL, 'Dian Daeli', 'diandaeli', 'diandaeli125@gmail.com', '$2b$10$XabxUPPEFMYg4wZXR.zEIu37A9xnaMwT/g1oMY4UQxU42G0a2Lpx2', NULL, NULL, 'active', 'approved', 'self_signup', '2026-08-23 10:14:40.763', 2, '2026-08-23 10:50:05.934', NULL, NULL, NULL, 'craft', NULL, '2026-08-23 11:10:35.701', NULL, 0, '2026-08-23 10:14:40.763', '2026-08-23 11:10:35.701', NULL),
(5, 1, NULL, 'Naura Ramadhani', 'nauraramadhani', 'nauraramadhani.nr32@gmail.com', '$2b$10$RLbe7PCKBRA535LsSCKJOuKbDN55MqfItEI1lN8eJtXApHUwU5v02', NULL, NULL, 'active', 'approved', 'self_signup', '2026-08-23 10:16:56.533', 2, '2026-08-23 10:50:00.349', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:16:56.533', '2026-08-23 10:50:00.349', NULL),
(6, 1, NULL, 'Amadea Salsabila', 'amadeasalsabila', 'rilldmnti@gmail.com', '$2b$10$3iUttKFVotoqazxXHSJvfeB3g4zAgQ85KaqjUi6kJsD7oGyz/hdSK', NULL, NULL, 'active', 'approved', 'self_signup', '2026-08-23 10:17:33.382', 2, '2026-08-23 10:49:54.447', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:17:33.382', '2026-08-23 10:49:54.447', NULL),
(7, 1, NULL, 'Cantika Anggi', 'cantikaanggi', 'cantikaanggianggraheni@gmail.com', '$2b$10$RB6gn.zNfGvtYdSuVOEIpuBziKzZ6DaOT1/g0IJZXaFI1yQYT4NPu', NULL, NULL, 'active', 'approved', 'self_signup', '2026-08-23 10:18:10.986', 2, '2026-08-23 10:49:50.871', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:18:10.986', '2026-08-23 10:49:50.871', NULL),
(8, 1, NULL, 'Siti Amany Fakhirah Riby', 'sitiamanyfakhirahriby', 'amanyfrss@gmail.com', '$2b$10$DInVMuTao6S.gXLHN1LDOesJsPICEsMBqaHg05T8in7xUYXOsW35O', NULL, NULL, 'active', 'approved', 'self_signup', '2026-08-23 10:19:35.785', 2, '2026-08-23 10:49:46.824', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:19:35.785', '2026-08-23 10:49:46.824', NULL),
(9, 1, NULL, 'Ahmad Ropaldo', 'ahmadropaldo', 'ahmadropaldo@gmail.com', '$2b$10$JBBoBb3h1j5idkGu0u.lSunIXGwWoLAmiPD7GzA18yEK5BAopsWOG', NULL, NULL, 'active', 'approved', 'self_signup', '2026-08-23 10:20:05.570', 2, '2026-08-23 10:49:42.815', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:20:05.570', '2026-08-23 10:49:42.815', NULL),
(10, 1, NULL, 'Nadine Nathania Pelleng', 'nadinenathaniapelleng', 'nathaniapelleng15@gmail.com', '$2b$10$3PbnHpPuPG2Y.kt/TLzMLuH7ZbjA3VPM5lg4obU/yIqnxIVkO1CuC', NULL, NULL, 'active', 'approved', 'self_signup', '2026-08-23 10:20:42.456', 2, '2026-08-23 10:49:37.870', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:20:42.456', '2026-08-23 10:49:37.870', NULL);

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
(10, 3, 1, '2026-08-23 10:49:37.876');

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
(9, 3, 1, NULL, NULL, '2026-08-23 10:50:09.749');

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
`supplier_invoice_id` bigint unsigned
,`business_unit_id` bigint unsigned
,`supplier_invoice_number` varchar(120)
,`supplier_party_id` bigint unsigned
,`supplier_name` varchar(200)
,`invoice_date` date
,`due_date` date
,`status_code` varchar(30)
,`total_amount` decimal(18,2)
,`paid_amount` decimal(18,2)
,`balance_due` decimal(18,2)
,`days_overdue` int
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_accounts_receivable`
-- (See below for the actual view)
--
CREATE TABLE `v_accounts_receivable` (
`invoice_id` bigint unsigned
,`business_unit_id` bigint unsigned
,`invoice_number` varchar(80)
,`party_id` bigint unsigned
,`party_name` varchar(200)
,`issue_date` date
,`due_date` date
,`status_code` varchar(30)
,`total_amount` decimal(18,2)
,`paid_amount` decimal(18,2)
,`balance_due` decimal(18,2)
,`days_overdue` int
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_craft_order_priority`
-- (See below for the actual view)
--
CREATE TABLE `v_craft_order_priority` (
`id` bigint unsigned
,`order_code` varchar(80)
,`customer_party_id` bigint unsigned
,`customer_name` varchar(200)
,`sales_channel_id` bigint unsigned
,`sales_channel_name` varchar(100)
,`order_date` datetime(3)
,`deadline_at` datetime(3)
,`priority_code` varchar(20)
,`priority_score` decimal(10,3)
,`status_code` varchar(30)
,`payment_status_code` varchar(30)
,`total_amount` decimal(18,2)
,`minutes_to_deadline` bigint
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_material_stock`
-- (See below for the actual view)
--
CREATE TABLE `v_material_stock` (
`material_id` bigint unsigned
,`business_unit_id` bigint unsigned
,`sku` varchar(80)
,`name` varchar(180)
,`material_type` varchar(80)
,`color_name` varchar(100)
,`unit_symbol` varchar(20)
,`total_qty` decimal(40,4)
,`reserved_qty` decimal(40,4)
,`available_qty` decimal(41,4)
,`low_stock_threshold` decimal(18,4)
,`stock_status` varchar(12)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_printer_current_activity`
-- (See below for the actual view)
--
CREATE TABLE `v_printer_current_activity` (
`printer_id` bigint unsigned
,`printer_code` varchar(60)
,`printer_name` varchar(150)
,`printer_status` varchar(30)
,`print_job_id` bigint unsigned
,`job_code` varchar(80)
,`job_name` varchar(200)
,`job_status` varchar(30)
,`progress_percent` decimal(6,2)
,`started_at` datetime(3)
,`estimated_finish_at` datetime(3)
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
  ADD KEY `fk_audit_logs_org` (`organization_id`),
  ADD KEY `fk_audit_logs_bu` (`business_unit_id`);

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
  ADD KEY `idx_calendar_events_time` (`start_at`,`end_at`),
  ADD KEY `idx_calendar_events_source` (`source_type`,`source_id`),
  ADD KEY `fk_calendar_events_org` (`organization_id`),
  ADD KEY `fk_calendar_events_bu` (`business_unit_id`),
  ADD KEY `fk_calendar_events_user` (`created_by`);

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
  ADD UNIQUE KEY `document_code` (`document_code`),
  ADD KEY `idx_documents_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_documents_type_date` (`document_type`,`created_at`),
  ADD KEY `fk_documents_org` (`organization_id`),
  ADD KEY `fk_documents_bu` (`business_unit_id`),
  ADD KEY `fk_documents_user` (`uploaded_by`);

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
  ADD KEY `fk_financial_period_user` (`closed_by`);

--
-- Indexes for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_code` (`transaction_code`),
  ADD KEY `idx_fin_transactions_bu_date` (`business_unit_id`,`transaction_date`,`transaction_type`),
  ADD KEY `idx_fin_transactions_source` (`source_type`,`source_id`),
  ADD KEY `idx_fin_transactions_account` (`treasury_account_id`,`transaction_date`),
  ADD KEY `fk_fin_transactions_org` (`organization_id`),
  ADD KEY `fk_fin_transactions_category` (`category_id`),
  ADD KEY `fk_fin_transactions_party` (`party_id`),
  ADD KEY `fk_fin_transactions_created_by` (`created_by`),
  ADD KEY `fk_fin_transactions_posted_by` (`posted_by`);

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
  ADD KEY `idx_internal_transfer_date` (`transfer_date`),
  ADD KEY `fk_internal_transfer_org` (`organization_id`),
  ADD KEY `fk_internal_transfer_from_bu` (`from_business_unit_id`),
  ADD KEY `fk_internal_transfer_to_bu` (`to_business_unit_id`),
  ADD KEY `fk_internal_transfer_from_account` (`from_treasury_account_id`),
  ADD KEY `fk_internal_transfer_to_account` (`to_treasury_account_id`),
  ADD KEY `fk_internal_transfer_journal` (`journal_entry_id`),
  ADD KEY `fk_internal_transfer_user` (`created_by`);

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
  ADD KEY `fk_invoices_org` (`organization_id`),
  ADD KEY `fk_invoices_quotation` (`quotation_id`),
  ADD KEY `fk_invoices_user` (`created_by`);

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
  ADD KEY `fk_journal_entries_org` (`organization_id`),
  ADD KEY `fk_journal_entries_period` (`financial_period_id`),
  ADD KEY `fk_journal_entries_tx` (`source_transaction_id`),
  ADD KEY `fk_journal_entries_reversal` (`reversal_of_id`),
  ADD KEY `fk_journal_entries_created_by` (`created_by`),
  ADD KEY `fk_journal_entries_posted_by` (`posted_by`);

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
  ADD KEY `idx_notifications_user_read` (`user_id`,`is_read`,`created_at`),
  ADD KEY `fk_notifications_org` (`organization_id`),
  ADD KEY `fk_notifications_bu` (`business_unit_id`);

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
  ADD KEY `fk_supplier_invoices_bu` (`business_unit_id`),
  ADD KEY `fk_supplier_invoices_po` (`purchase_order_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_system_setting` (`organization_id`,`business_unit_id`,`setting_group`,`setting_key`),
  ADD KEY `fk_system_settings_bu` (`business_unit_id`),
  ADD KEY `fk_system_settings_user` (`updated_by`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `task_code` (`task_code`),
  ADD KEY `idx_tasks_status_due` (`status_code`,`due_at`),
  ADD KEY `fk_tasks_org` (`organization_id`),
  ADD KEY `fk_tasks_bu` (`business_unit_id`),
  ADD KEY `fk_tasks_created_by` (`created_by`);

--
-- Indexes for table `task_assignees`
--
ALTER TABLE `task_assignees`
  ADD PRIMARY KEY (`task_id`,`user_id`),
  ADD KEY `fk_task_assignees_user` (`user_id`);

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
  ADD KEY `fk_treasury_accounts_org` (`organization_id`),
  ADD KEY `fk_treasury_accounts_bu` (`business_unit_id`),
  ADD KEY `fk_treasury_accounts_coa` (`coa_account_id`);

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `budget_items`
--
ALTER TABLE `budget_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `business_units`
--
ALTER TABLE `business_units`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `calendar_events`
--
ALTER TABLE `calendar_events`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `channel_product_mappings`
--
ALTER TABLE `channel_product_mappings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `craft_orders`
--
ALTER TABLE `craft_orders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `craft_order_drafts`
--
ALTER TABLE `craft_order_drafts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `craft_order_items`
--
ALTER TABLE `craft_order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `filament_spools`
--
ALTER TABLE `filament_spools`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `financial_periods`
--
ALTER TABLE `financial_periods`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `integrations`
--
ALTER TABLE `integrations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `integration_sync_logs`
--
ALTER TABLE `integration_sync_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `internal_transfers`
--
ALTER TABLE `internal_transfers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_movements`
--
ALTER TABLE `inventory_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `journal_lines`
--
ALTER TABLE `journal_lines`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `login_history`
--
ALTER TABLE `login_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_fee_rules`
--
ALTER TABLE `marketplace_fee_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `marketplace_settlements`
--
ALTER TABLE `marketplace_settlements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `marketplace_settlement_items`
--
ALTER TABLE `marketplace_settlement_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `master_options`
--
ALTER TABLE `master_options`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `materials`
--
ALTER TABLE `materials`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `material_batches`
--
ALTER TABLE `material_batches`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `material_categories`
--
ALTER TABLE `material_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `material_waste`
--
ALTER TABLE `material_waste`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_attachments`
--
ALTER TABLE `order_attachments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations`
--
ALTER TABLE `organizations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `parties`
--
ALTER TABLE `parties`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `partner_price_rules`
--
ALTER TABLE `partner_price_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `party_contacts`
--
ALTER TABLE `party_contacts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `party_roles`
--
ALTER TABLE `party_roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `printers`
--
ALTER TABLE `printers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `printer_issues`
--
ALTER TABLE `printer_issues`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `printer_maintenance_records`
--
ALTER TABLE `printer_maintenance_records`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `printer_maintenance_schedules`
--
ALTER TABLE `printer_maintenance_schedules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `print_failures`
--
ALTER TABLE `print_failures`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `print_jobs`
--
ALTER TABLE `print_jobs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `print_job_materials`
--
ALTER TABLE `print_job_materials`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `print_job_status_history`
--
ALTER TABLE `print_job_status_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `purchase_requests`
--
ALTER TABLE `purchase_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `purchase_request_items`
--
ALTER TABLE `purchase_request_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `report_exports`
--
ALTER TABLE `report_exports`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `sales_channels`
--
ALTER TABLE `sales_channels`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `supplier_invoices`
--
ALTER TABLE `supplier_invoices`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transaction_categories`
--
ALTER TABLE `transaction_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `treasury_accounts`
--
ALTER TABLE `treasury_accounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `units_of_measure`
--
ALTER TABLE `units_of_measure`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

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
  ADD CONSTRAINT `fk_calendar_events_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

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
  ADD CONSTRAINT `fk_system_settings_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_system_settings_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  ADD CONSTRAINT `fk_system_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_tasks_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `task_assignees`
--
ALTER TABLE `task_assignees`
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
