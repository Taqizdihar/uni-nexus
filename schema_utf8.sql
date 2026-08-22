-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
--
-- Host: localhost    Database: uni-nexus
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `asset_maintenance_records`
--

DROP TABLE IF EXISTS `asset_maintenance_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_maintenance_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `maintenance_type` varchar(100) NOT NULL,
  `performed_at` datetime(3) NOT NULL,
  `performed_by_party_id` bigint unsigned DEFAULT NULL,
  `cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `next_due_at` datetime(3) DEFAULT NULL,
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_asset_maintenance_asset_date` (`asset_id`,`performed_at`),
  KEY `fk_asset_maintenance_party` (`performed_by_party_id`),
  CONSTRAINT `fk_asset_maintenance_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asset_maintenance_party` FOREIGN KEY (`performed_by_party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_project_assignments`
--

DROP TABLE IF EXISTS `asset_project_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_project_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `project_id` bigint unsigned NOT NULL,
  `assigned_from` datetime(3) NOT NULL,
  `assigned_until` datetime(3) DEFAULT NULL,
  `returned_at` datetime(3) DEFAULT NULL,
  `assigned_by` bigint unsigned DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_assignment_asset` (`asset_id`,`returned_at`),
  KEY `idx_asset_assignment_project` (`project_id`),
  KEY `fk_asset_assignment_user` (`assigned_by`),
  CONSTRAINT `fk_asset_assignment_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `fk_asset_assignment_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asset_assignment_user` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
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
  `useful_life_months` int unsigned DEFAULT NULL,
  `location_name` varchar(150) DEFAULT NULL,
  `assigned_user_id` bigint unsigned DEFAULT NULL,
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_code` (`asset_code`),
  KEY `idx_assets_bu_status` (`business_unit_id`,`status_code`),
  KEY `fk_assets_user` (`assigned_user_id`),
  CONSTRAINT `fk_assets_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_assets_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `module_code` varchar(80) NOT NULL,
  `action_code` varchar(80) NOT NULL COMMENT 'create|update|delete|login|logout|status_change|export|approve|etc',
  `entity_type` varchar(80) DEFAULT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `entity_code` varchar(120) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_time` (`user_id`,`created_at`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`,`created_at`),
  KEY `idx_audit_logs_module` (`module_code`,`action_code`,`created_at`),
  KEY `fk_audit_logs_org` (`organization_id`),
  KEY `fk_audit_logs_bu` (`business_unit_id`),
  CONSTRAINT `fk_audit_logs_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_audit_logs_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `automation_rules`
--

DROP TABLE IF EXISTS `automation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `automation_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `rule_code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `module_code` varchar(60) NOT NULL,
  `trigger_event` varchar(100) NOT NULL,
  `condition_json` json DEFAULT NULL,
  `action_json` json NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'active' COMMENT 'draft|active|paused|disabled',
  `priority` int NOT NULL DEFAULT '100',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `rule_code` (`rule_code`),
  KEY `fk_automation_rules_org` (`organization_id`),
  KEY `fk_automation_rules_bu` (`business_unit_id`),
  KEY `fk_automation_rules_user` (`created_by`),
  CONSTRAINT `fk_automation_rules_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_automation_rules_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_automation_rules_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `automation_runs`
--

DROP TABLE IF EXISTS `automation_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `automation_runs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `rule_id` bigint unsigned NOT NULL,
  `trigger_entity_type` varchar(60) DEFAULT NULL,
  `trigger_entity_id` bigint unsigned DEFAULT NULL,
  `status_code` varchar(30) NOT NULL COMMENT 'queued|running|success|failed|skipped',
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finished_at` datetime(3) DEFAULT NULL,
  `input_json` json DEFAULT NULL,
  `result_json` json DEFAULT NULL,
  `error_message` text,
  PRIMARY KEY (`id`),
  KEY `idx_automation_runs_rule_time` (`rule_id`,`started_at`),
  CONSTRAINT `fk_automation_runs_rule` FOREIGN KEY (`rule_id`) REFERENCES `automation_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `budget_items`
--

DROP TABLE IF EXISTS `budget_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budget_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `budget_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `name` varchar(180) NOT NULL,
  `allocated_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_budget_items_budget` (`budget_id`),
  KEY `fk_budget_items_category` (`category_id`),
  CONSTRAINT `fk_budget_items_budget` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_budget_items_category` FOREIGN KEY (`category_id`) REFERENCES `transaction_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `budgets`
--

DROP TABLE IF EXISTS `budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budgets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `budget_code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'draft' COMMENT 'draft|approved|active|closed',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `created_by` bigint unsigned DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_code` (`budget_code`),
  KEY `fk_budgets_org` (`organization_id`),
  KEY `fk_budgets_bu` (`business_unit_id`),
  KEY `fk_budgets_created_by` (`created_by`),
  KEY `fk_budgets_approved_by` (`approved_by`),
  CONSTRAINT `fk_budgets_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_budgets_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_budgets_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_budgets_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `business_units`
--

DROP TABLE IF EXISTS `business_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_units` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `unit_type` varchar(30) NOT NULL COMMENT 'craft|studio|shared',
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_business_unit_org_code` (`organization_id`,`code`),
  KEY `idx_business_units_type` (`unit_type`),
  CONSTRAINT `fk_business_units_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calendar_events`
--

DROP TABLE IF EXISTS `calendar_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `title` varchar(220) NOT NULL,
  `description` text,
  `event_type` varchar(50) NOT NULL COMMENT 'order_deadline|production|project_deadline|maintenance|payment|meeting|task|other',
  `start_at` datetime(3) NOT NULL,
  `end_at` datetime(3) DEFAULT NULL,
  `all_day` tinyint(1) NOT NULL DEFAULT '0',
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_calendar_events_time` (`start_at`,`end_at`),
  KEY `idx_calendar_events_source` (`source_type`,`source_id`),
  KEY `fk_calendar_events_org` (`organization_id`),
  KEY `fk_calendar_events_bu` (`business_unit_id`),
  KEY `fk_calendar_events_user` (`created_by`),
  CONSTRAINT `fk_calendar_events_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_calendar_events_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_calendar_events_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `channel_product_mappings`
--

DROP TABLE IF EXISTS `channel_product_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `channel_product_mappings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sales_channel_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `external_product_id` varchar(190) DEFAULT NULL,
  `external_sku` varchar(190) DEFAULT NULL,
  `external_url` varchar(500) DEFAULT NULL,
  `sync_status_code` varchar(30) NOT NULL DEFAULT 'manual',
  `last_synced_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_channel_product_variant` (`sales_channel_id`,`product_id`,`variant_id`),
  KEY `fk_channel_product_mapping_product` (`product_id`),
  KEY `fk_channel_product_mapping_variant` (`variant_id`),
  CONSTRAINT `fk_channel_product_mapping_channel` FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_channel_product_mapping_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_channel_product_mapping_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chart_of_accounts`
--

DROP TABLE IF EXISTS `chart_of_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chart_of_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `account_code` varchar(30) NOT NULL,
  `account_name` varchar(180) NOT NULL,
  `account_type` varchar(30) NOT NULL COMMENT 'asset|liability|equity|revenue|expense',
  `normal_balance` varchar(10) NOT NULL COMMENT 'debit|credit',
  `parent_account_id` bigint unsigned DEFAULT NULL,
  `is_control_account` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coa_org_code` (`organization_id`,`account_code`),
  KEY `idx_coa_type` (`account_type`,`is_active`),
  KEY `fk_coa_bu` (`business_unit_id`),
  KEY `fk_coa_parent` (`parent_account_id`),
  CONSTRAINT `fk_coa_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_coa_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_coa_parent` FOREIGN KEY (`parent_account_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `craft_order_items`
--

DROP TABLE IF EXISTS `craft_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `craft_order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `item_name` varchar(200) NOT NULL,
  `item_description` text,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `unit_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `estimated_material_g` decimal(12,3) DEFAULT NULL,
  `estimated_print_minutes` int unsigned DEFAULT NULL,
  `print_profile_id` bigint unsigned DEFAULT NULL,
  `custom_spec_json` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `fk_order_items_product` (`product_id`),
  KEY `fk_order_items_variant` (`variant_id`),
  KEY `fk_order_items_profile` (`print_profile_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_items_profile` FOREIGN KEY (`print_profile_id`) REFERENCES `print_profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `craft_order_status_history`
--

DROP TABLE IF EXISTS `craft_order_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `craft_order_status_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `from_status_code` varchar(30) DEFAULT NULL,
  `to_status_code` varchar(30) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `changed_by` bigint unsigned DEFAULT NULL,
  `changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_order_status_history_order` (`order_id`,`changed_at`),
  KEY `fk_order_status_history_user` (`changed_by`),
  CONSTRAINT `fk_order_status_history_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `craft_orders`
--

DROP TABLE IF EXISTS `craft_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `craft_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `order_code` varchar(80) NOT NULL,
  `customer_party_id` bigint unsigned NOT NULL,
  `sales_channel_id` bigint unsigned NOT NULL,
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
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `completed_at` datetime(3) DEFAULT NULL,
  `cancelled_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_code` (`order_code`),
  KEY `idx_craft_orders_priority` (`status_code`,`deadline_at`,`priority_score`),
  KEY `idx_craft_orders_customer` (`customer_party_id`,`order_date`),
  KEY `idx_craft_orders_channel` (`sales_channel_id`,`order_date`),
  KEY `idx_craft_orders_payment` (`payment_status_code`),
  KEY `fk_craft_orders_bu` (`business_unit_id`),
  KEY `fk_craft_orders_user` (`created_by`),
  CONSTRAINT `fk_craft_orders_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_craft_orders_channel` FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels` (`id`),
  CONSTRAINT `fk_craft_orders_customer` FOREIGN KEY (`customer_party_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `fk_craft_orders_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `design_files`
--

DROP TABLE IF EXISTS `design_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `design_files` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `design_code` varchar(80) NOT NULL,
  `name` varchar(200) NOT NULL,
  `file_type` varchar(20) NOT NULL COMMENT 'stl|3mf|step|scad|obj|blend|other',
  `file_name` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `version_label` varchar(50) DEFAULT NULL,
  `file_size_bytes` bigint unsigned DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `is_final` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `design_code` (`design_code`),
  KEY `idx_design_files_product` (`product_id`,`variant_id`),
  KEY `fk_design_files_bu` (`business_unit_id`),
  KEY `fk_design_files_variant` (`variant_id`),
  KEY `fk_design_files_user` (`uploaded_by`),
  CONSTRAINT `fk_design_files_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_design_files_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_design_files_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_design_files_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_templates`
--

DROP TABLE IF EXISTS `document_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `template_code` varchar(80) NOT NULL,
  `template_type` varchar(60) NOT NULL COMMENT 'invoice|quotation|receipt|report|purchase_order|other',
  `name` varchar(180) NOT NULL,
  `html_template` longtext,
  `config_json` json DEFAULT NULL,
  `header_logo_path` varchar(500) DEFAULT NULL,
  `footer_text` text,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_code` (`template_code`),
  KEY `fk_document_templates_org` (`organization_id`),
  KEY `fk_document_templates_bu` (`business_unit_id`),
  KEY `fk_document_templates_user` (`created_by`),
  CONSTRAINT `fk_document_templates_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_document_templates_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_document_templates_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `document_code` varchar(80) DEFAULT NULL,
  `document_type` varchar(60) NOT NULL COMMENT 'invoice|quotation|receipt|report|purchase_order|contract|design|other',
  `title` varchar(220) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `file_size_bytes` bigint unsigned DEFAULT NULL,
  `entity_type` varchar(60) DEFAULT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `version_no` int unsigned NOT NULL DEFAULT '1',
  `is_template` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_code` (`document_code`),
  KEY `idx_documents_entity` (`entity_type`,`entity_id`),
  KEY `idx_documents_type_date` (`document_type`,`created_at`),
  KEY `fk_documents_org` (`organization_id`),
  KEY `fk_documents_bu` (`business_unit_id`),
  KEY `fk_documents_user` (`uploaded_by`),
  CONSTRAINT `fk_documents_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_documents_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_documents_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned NOT NULL,
  `expense_code` varchar(80) NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `party_id` bigint unsigned DEFAULT NULL,
  `treasury_account_id` bigint unsigned DEFAULT NULL,
  `financial_transaction_id` bigint unsigned DEFAULT NULL,
  `craft_order_id` bigint unsigned DEFAULT NULL,
  `studio_project_id` bigint unsigned DEFAULT NULL,
  `expense_date` datetime(3) NOT NULL,
  `description` varchar(500) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `status_code` varchar(30) NOT NULL DEFAULT 'paid' COMMENT 'draft|approved|paid|void',
  `receipt_path` varchar(500) DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_code` (`expense_code`),
  KEY `idx_expenses_bu_date` (`business_unit_id`,`expense_date`),
  KEY `idx_expenses_project` (`studio_project_id`),
  KEY `idx_expenses_order` (`craft_order_id`),
  KEY `fk_expenses_org` (`organization_id`),
  KEY `fk_expenses_category` (`category_id`),
  KEY `fk_expenses_party` (`party_id`),
  KEY `fk_expenses_treasury` (`treasury_account_id`),
  KEY `fk_expenses_transaction` (`financial_transaction_id`),
  KEY `fk_expenses_created_by` (`created_by`),
  KEY `fk_expenses_approved_by` (`approved_by`),
  CONSTRAINT `fk_expenses_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_expenses_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_expenses_category` FOREIGN KEY (`category_id`) REFERENCES `transaction_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_expenses_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_expenses_order` FOREIGN KEY (`craft_order_id`) REFERENCES `craft_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_expenses_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_expenses_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_expenses_project` FOREIGN KEY (`studio_project_id`) REFERENCES `studio_projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_expenses_transaction` FOREIGN KEY (`financial_transaction_id`) REFERENCES `financial_transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_expenses_treasury` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `filament_spools`
--

DROP TABLE IF EXISTS `filament_spools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `filament_spools` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_batch_id` bigint unsigned NOT NULL,
  `spool_code` varchar(80) NOT NULL,
  `diameter_mm` decimal(6,3) NOT NULL DEFAULT '1.750',
  `nominal_net_weight_g` decimal(12,3) DEFAULT NULL,
  `tare_weight_g` decimal(12,3) DEFAULT NULL,
  `current_net_weight_g` decimal(12,3) DEFAULT NULL,
  `opened_at` datetime(3) DEFAULT NULL,
  `dried_at` datetime(3) DEFAULT NULL,
  `storage_location` varchar(120) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `material_batch_id` (`material_batch_id`),
  UNIQUE KEY `spool_code` (`spool_code`),
  CONSTRAINT `fk_filament_spools_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `financial_periods`
--

DROP TABLE IF EXISTS `financial_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_periods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `period_code` varchar(30) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status_code` varchar(20) NOT NULL DEFAULT 'open' COMMENT 'open|closed|locked',
  `closed_by` bigint unsigned DEFAULT NULL,
  `closed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_financial_period` (`organization_id`,`period_code`),
  KEY `fk_financial_period_user` (`closed_by`),
  CONSTRAINT `fk_financial_period_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_financial_period_user` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `financial_transactions`
--

DROP TABLE IF EXISTS `financial_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned NOT NULL,
  `transaction_code` varchar(80) NOT NULL,
  `transaction_date` datetime(3) NOT NULL,
  `transaction_type` varchar(30) NOT NULL COMMENT 'income|expense|transfer|adjustment',
  `category_id` bigint unsigned DEFAULT NULL,
  `treasury_account_id` bigint unsigned DEFAULT NULL,
  `party_id` bigint unsigned DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `description` varchar(500) NOT NULL,
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint unsigned DEFAULT NULL,
  `source_code` varchar(100) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'posted' COMMENT 'draft|posted|void',
  `created_by` bigint unsigned DEFAULT NULL,
  `posted_by` bigint unsigned DEFAULT NULL,
  `posted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_code` (`transaction_code`),
  KEY `idx_fin_transactions_bu_date` (`business_unit_id`,`transaction_date`,`transaction_type`),
  KEY `idx_fin_transactions_source` (`source_type`,`source_id`),
  KEY `idx_fin_transactions_account` (`treasury_account_id`,`transaction_date`),
  KEY `fk_fin_transactions_org` (`organization_id`),
  KEY `fk_fin_transactions_category` (`category_id`),
  KEY `fk_fin_transactions_party` (`party_id`),
  KEY `fk_fin_transactions_created_by` (`created_by`),
  KEY `fk_fin_transactions_posted_by` (`posted_by`),
  CONSTRAINT `fk_fin_transactions_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_fin_transactions_category` FOREIGN KEY (`category_id`) REFERENCES `transaction_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fin_transactions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fin_transactions_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_fin_transactions_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fin_transactions_posted_by` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fin_transactions_treasury` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goods_receipt_items`
--

DROP TABLE IF EXISTS `goods_receipt_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goods_receipt_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `goods_receipt_id` bigint unsigned NOT NULL,
  `purchase_order_item_id` bigint unsigned NOT NULL,
  `material_batch_id` bigint unsigned DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `accepted_qty` decimal(18,4) NOT NULL,
  `rejected_qty` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `rejection_reason` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_goods_receipt_items_receipt` (`goods_receipt_id`),
  KEY `fk_goods_receipt_items_po_item` (`purchase_order_item_id`),
  KEY `fk_goods_receipt_items_batch` (`material_batch_id`),
  CONSTRAINT `fk_goods_receipt_items_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_goods_receipt_items_po_item` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`id`),
  CONSTRAINT `fk_goods_receipt_items_receipt` FOREIGN KEY (`goods_receipt_id`) REFERENCES `goods_receipts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goods_receipts`
--

DROP TABLE IF EXISTS `goods_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goods_receipts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `receipt_number` varchar(80) NOT NULL,
  `purchase_order_id` bigint unsigned NOT NULL,
  `received_at` datetime(3) NOT NULL,
  `received_by` bigint unsigned DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'received',
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `fk_goods_receipts_bu` (`business_unit_id`),
  KEY `fk_goods_receipts_po` (`purchase_order_id`),
  KEY `fk_goods_receipts_user` (`received_by`),
  CONSTRAINT `fk_goods_receipts_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_goods_receipts_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  CONSTRAINT `fk_goods_receipts_user` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `integration_sync_logs`
--

DROP TABLE IF EXISTS `integration_sync_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `integration_sync_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `integration_id` bigint unsigned NOT NULL,
  `sync_type` varchar(60) NOT NULL,
  `direction` varchar(20) NOT NULL DEFAULT 'inbound' COMMENT 'inbound|outbound|bidirectional',
  `status_code` varchar(30) NOT NULL COMMENT 'running|success|partial|failed',
  `started_at` datetime(3) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `records_processed` int unsigned NOT NULL DEFAULT '0',
  `records_success` int unsigned NOT NULL DEFAULT '0',
  `records_failed` int unsigned NOT NULL DEFAULT '0',
  `error_message` text,
  `metadata` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sync_logs_integration_time` (`integration_id`,`started_at`),
  CONSTRAINT `fk_integration_sync_logs_integration` FOREIGN KEY (`integration_id`) REFERENCES `integrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `integrations`
--

DROP TABLE IF EXISTS `integrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `integration_code` varchar(80) NOT NULL,
  `integration_type` varchar(50) NOT NULL COMMENT 'marketplace|google|messaging|payment|api|webhook|other',
  `provider_name` varchar(120) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'not_connected' COMMENT 'not_connected|connected|error|disabled|planned',
  `config_json` json DEFAULT NULL COMMENT 'Do not store raw secrets; use encrypted secret storage in backend',
  `last_sync_at` datetime(3) DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_integration` (`organization_id`,`business_unit_id`,`integration_code`),
  KEY `fk_integrations_bu` (`business_unit_id`),
  KEY `fk_integrations_user` (`created_by`),
  CONSTRAINT `fk_integrations_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_integrations_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_integrations_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `internal_transfers`
--

DROP TABLE IF EXISTS `internal_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `internal_transfers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `transfer_code` varchar(80) NOT NULL,
  `from_business_unit_id` bigint unsigned NOT NULL,
  `to_business_unit_id` bigint unsigned NOT NULL,
  `from_treasury_account_id` bigint unsigned NOT NULL,
  `to_treasury_account_id` bigint unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `transfer_date` datetime(3) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'completed' COMMENT 'draft|completed|void',
  `journal_entry_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfer_code` (`transfer_code`),
  KEY `idx_internal_transfer_date` (`transfer_date`),
  KEY `fk_internal_transfer_org` (`organization_id`),
  KEY `fk_internal_transfer_from_bu` (`from_business_unit_id`),
  KEY `fk_internal_transfer_to_bu` (`to_business_unit_id`),
  KEY `fk_internal_transfer_from_account` (`from_treasury_account_id`),
  KEY `fk_internal_transfer_to_account` (`to_treasury_account_id`),
  KEY `fk_internal_transfer_journal` (`journal_entry_id`),
  KEY `fk_internal_transfer_user` (`created_by`),
  CONSTRAINT `fk_internal_transfer_from_account` FOREIGN KEY (`from_treasury_account_id`) REFERENCES `treasury_accounts` (`id`),
  CONSTRAINT `fk_internal_transfer_from_bu` FOREIGN KEY (`from_business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_internal_transfer_journal` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_internal_transfer_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_internal_transfer_to_account` FOREIGN KEY (`to_treasury_account_id`) REFERENCES `treasury_accounts` (`id`),
  CONSTRAINT `fk_internal_transfer_to_bu` FOREIGN KEY (`to_business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_internal_transfer_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory_movements`
--

DROP TABLE IF EXISTS `inventory_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `material_batch_id` bigint unsigned DEFAULT NULL,
  `movement_type` varchar(40) NOT NULL COMMENT 'stock_in|production_usage|waste|adjustment_in|adjustment_out|return_in|return_out|reservation|release',
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint unsigned NOT NULL,
  `unit_cost` decimal(18,4) DEFAULT NULL,
  `total_cost` decimal(18,2) DEFAULT NULL,
  `reference_type` varchar(60) DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `reference_code` varchar(100) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `occurred_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_inventory_movements_material_time` (`material_id`,`occurred_at`),
  KEY `idx_inventory_movements_reference` (`reference_type`,`reference_id`),
  KEY `fk_inventory_movement_bu` (`business_unit_id`),
  KEY `fk_inventory_movement_batch` (`material_batch_id`),
  KEY `fk_inventory_movement_unit` (`unit_id`),
  KEY `fk_inventory_movement_user` (`created_by`),
  CONSTRAINT `fk_inventory_movement_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inventory_movement_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_inventory_movement_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  CONSTRAINT `fk_inventory_movement_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`),
  CONSTRAINT `fk_inventory_movement_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `service_id` bigint unsigned DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `unit_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_invoice_items_invoice` (`invoice_id`),
  KEY `fk_invoice_items_product` (`product_id`),
  KEY `fk_invoice_items_service` (`service_id`),
  CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoice_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoice_items_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_payment_schedules`
--

DROP TABLE IF EXISTS `invoice_payment_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_payment_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint unsigned NOT NULL,
  `installment_no` int unsigned NOT NULL,
  `label` varchar(120) DEFAULT NULL COMMENT 'DP, Termin 2, Pelunasan, etc',
  `due_date` date NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `paid_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|partial|paid|overdue|cancelled',
  `paid_at` datetime(3) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoice_installment` (`invoice_id`,`installment_no`),
  KEY `idx_invoice_payment_schedule_due` (`status_code`,`due_date`),
  CONSTRAINT `fk_invoice_payment_schedule_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned NOT NULL,
  `invoice_number` varchar(80) NOT NULL,
  `party_id` bigint unsigned NOT NULL,
  `quotation_id` bigint unsigned DEFAULT NULL,
  `source_type` varchar(50) DEFAULT NULL COMMENT 'craft_order|studio_project|manual',
  `source_id` bigint unsigned DEFAULT NULL,
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
  `created_by` bigint unsigned DEFAULT NULL,
  `issued_at` datetime(3) DEFAULT NULL,
  `paid_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `idx_invoices_party_due` (`party_id`,`due_date`,`status_code`),
  KEY `idx_invoices_bu_date` (`business_unit_id`,`issue_date`),
  KEY `idx_invoices_source` (`source_type`,`source_id`),
  KEY `fk_invoices_org` (`organization_id`),
  KEY `fk_invoices_quotation` (`quotation_id`),
  KEY `fk_invoices_user` (`created_by`),
  CONSTRAINT `fk_invoices_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_invoices_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_invoices_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `fk_invoices_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `journal_entries`
--

DROP TABLE IF EXISTS `journal_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned NOT NULL,
  `financial_period_id` bigint unsigned DEFAULT NULL,
  `journal_number` varchar(80) NOT NULL,
  `entry_date` datetime(3) NOT NULL,
  `description` varchar(500) NOT NULL,
  `source_transaction_id` bigint unsigned DEFAULT NULL,
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint unsigned DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'posted' COMMENT 'draft|posted|reversed',
  `reversal_of_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `posted_by` bigint unsigned DEFAULT NULL,
  `posted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `journal_number` (`journal_number`),
  KEY `idx_journal_entries_date` (`business_unit_id`,`entry_date`),
  KEY `fk_journal_entries_org` (`organization_id`),
  KEY `fk_journal_entries_period` (`financial_period_id`),
  KEY `fk_journal_entries_tx` (`source_transaction_id`),
  KEY `fk_journal_entries_reversal` (`reversal_of_id`),
  KEY `fk_journal_entries_created_by` (`created_by`),
  KEY `fk_journal_entries_posted_by` (`posted_by`),
  CONSTRAINT `fk_journal_entries_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_journal_entries_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_journal_entries_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_journal_entries_period` FOREIGN KEY (`financial_period_id`) REFERENCES `financial_periods` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_journal_entries_posted_by` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_journal_entries_reversal` FOREIGN KEY (`reversal_of_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_journal_entries_tx` FOREIGN KEY (`source_transaction_id`) REFERENCES `financial_transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `journal_lines`
--

DROP TABLE IF EXISTS `journal_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `journal_entry_id` bigint unsigned NOT NULL,
  `coa_account_id` bigint unsigned NOT NULL,
  `party_id` bigint unsigned DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `debit_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `credit_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_journal_lines_account` (`coa_account_id`),
  KEY `fk_journal_lines_entry` (`journal_entry_id`),
  KEY `fk_journal_lines_party` (`party_id`),
  CONSTRAINT `fk_journal_lines_coa` FOREIGN KEY (`coa_account_id`) REFERENCES `chart_of_accounts` (`id`),
  CONSTRAINT `fk_journal_lines_entry` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_journal_lines_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `login_history`
--

DROP TABLE IF EXISTS `login_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `login_identifier` varchar(190) DEFAULT NULL,
  `success` tinyint(1) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `failure_reason` varchar(255) DEFAULT NULL,
  `logged_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_login_history_user_time` (`user_id`,`logged_at`),
  CONSTRAINT `fk_login_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `marketplace_fee_rules`
--

DROP TABLE IF EXISTS `marketplace_fee_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketplace_fee_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sales_channel_id` bigint unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `fee_type` varchar(30) NOT NULL COMMENT 'percentage|fixed|mixed',
  `percentage_rate` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `fixed_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `applies_to` varchar(30) NOT NULL DEFAULT 'gross_sales',
  `effective_from` date NOT NULL,
  `effective_until` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_marketplace_fee_channel_dates` (`sales_channel_id`,`effective_from`,`effective_until`),
  CONSTRAINT `fk_marketplace_fee_channel` FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `marketplace_settlement_items`
--

DROP TABLE IF EXISTS `marketplace_settlement_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketplace_settlement_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `settlement_id` bigint unsigned NOT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `external_order_id` varchar(190) DEFAULT NULL,
  `gross_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `fee_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `adjustment_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_marketplace_settlement_items_settlement` (`settlement_id`),
  KEY `fk_marketplace_settlement_items_order` (`order_id`),
  CONSTRAINT `fk_marketplace_settlement_items_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_marketplace_settlement_items_settlement` FOREIGN KEY (`settlement_id`) REFERENCES `marketplace_settlements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `marketplace_settlements`
--

DROP TABLE IF EXISTS `marketplace_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketplace_settlements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sales_channel_id` bigint unsigned NOT NULL,
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
  `treasury_account_id` bigint unsigned DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|received|reconciled',
  `external_reference` varchar(190) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `settlement_code` (`settlement_code`),
  KEY `fk_marketplace_settlement_channel` (`sales_channel_id`),
  KEY `fk_marketplace_settlement_treasury` (`treasury_account_id`),
  CONSTRAINT `fk_marketplace_settlement_channel` FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels` (`id`),
  CONSTRAINT `fk_marketplace_settlement_treasury` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `master_options`
--

DROP TABLE IF EXISTS `master_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_options` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `group_key` varchar(80) NOT NULL,
  `code` varchar(80) NOT NULL,
  `label` varchar(150) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_option` (`organization_id`,`group_key`,`code`),
  KEY `idx_master_options_group` (`group_key`,`is_active`),
  CONSTRAINT `fk_master_options_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_batches`
--

DROP TABLE IF EXISTS `material_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_batches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_id` bigint unsigned NOT NULL,
  `batch_code` varchar(80) NOT NULL,
  `supplier_id` bigint unsigned DEFAULT NULL,
  `purchase_order_item_id` bigint unsigned DEFAULT NULL COMMENT 'Populated after procurement tables exist; application-level link in v1',
  `received_at` datetime(3) DEFAULT NULL,
  `initial_qty` decimal(18,4) NOT NULL,
  `current_qty` decimal(18,4) NOT NULL,
  `reserved_qty` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `expiry_date` date DEFAULT NULL,
  `location_code` varchar(80) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'available',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_code` (`batch_code`),
  KEY `idx_material_batches_material_status` (`material_id`,`status_code`),
  KEY `fk_material_batches_supplier` (`supplier_id`),
  CONSTRAINT `fk_material_batches_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  CONSTRAINT `fk_material_batches_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_categories`
--

DROP TABLE IF EXISTS `material_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category_type` varchar(30) NOT NULL COMMENT 'filament|resin|hardware|packaging|consumable|other',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_material_category` (`business_unit_id`,`code`),
  CONSTRAINT `fk_material_categories_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_waste`
--

DROP TABLE IF EXISTS `material_waste`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_waste` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_id` bigint unsigned NOT NULL,
  `material_batch_id` bigint unsigned DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint unsigned NOT NULL,
  `waste_reason` varchar(50) NOT NULL COMMENT 'failed_print|support|purge|calibration|scrap|other',
  `print_job_id` bigint unsigned DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `occurred_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_material_waste_material_time` (`material_id`,`occurred_at`),
  KEY `fk_material_waste_batch` (`material_batch_id`),
  KEY `fk_material_waste_unit` (`unit_id`),
  KEY `fk_material_waste_user` (`created_by`),
  KEY `fk_material_waste_print_job` (`print_job_id`),
  CONSTRAINT `fk_material_waste_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_material_waste_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  CONSTRAINT `fk_material_waste_print_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_material_waste_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`),
  CONSTRAINT `fk_material_waste_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `materials`
--

DROP TABLE IF EXISTS `materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `sku` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `brand` varchar(120) DEFAULT NULL,
  `material_type` varchar(80) DEFAULT NULL COMMENT 'PLA|PETG|ABS|TPU|resin|magnet|screw|etc',
  `color_name` varchar(100) DEFAULT NULL,
  `color_hex` varchar(10) DEFAULT NULL,
  `base_unit_id` bigint unsigned NOT NULL,
  `default_unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `low_stock_threshold` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reorder_qty` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `preferred_supplier_id` bigint unsigned DEFAULT NULL,
  `notes` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_materials_bu_category` (`business_unit_id`,`category_id`),
  KEY `idx_materials_name` (`name`),
  KEY `fk_materials_category` (`category_id`),
  KEY `fk_materials_unit` (`base_unit_id`),
  KEY `fk_materials_supplier` (`preferred_supplier_id`),
  CONSTRAINT `fk_materials_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_materials_category` FOREIGN KEY (`category_id`) REFERENCES `material_categories` (`id`),
  CONSTRAINT `fk_materials_supplier` FOREIGN KEY (`preferred_supplier_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_materials_unit` FOREIGN KEY (`base_unit_id`) REFERENCES `units_of_measure` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL COMMENT 'NULL = broadcast',
  `notification_type` varchar(60) NOT NULL,
  `severity_code` varchar(20) NOT NULL DEFAULT 'info' COMMENT 'info|success|warning|error|critical',
  `title` varchar(180) NOT NULL,
  `message` text NOT NULL,
  `action_url` varchar(500) DEFAULT NULL,
  `entity_type` varchar(60) DEFAULT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read` (`user_id`,`is_read`,`created_at`),
  KEY `fk_notifications_org` (`organization_id`),
  KEY `fk_notifications_bu` (`business_unit_id`),
  CONSTRAINT `fk_notifications_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notifications_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_attachments`
--

DROP TABLE IF EXISTS `order_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(60) DEFAULT NULL,
  `storage_path` varchar(500) NOT NULL,
  `file_size_bytes` bigint unsigned DEFAULT NULL,
  `attachment_type` varchar(40) NOT NULL DEFAULT 'reference' COMMENT 'reference|brief|approval|design|other',
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_attachments_order` (`order_id`),
  KEY `fk_order_attachments_user` (`uploaded_by`),
  CONSTRAINT `fk_order_attachments_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_attachments_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
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
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parties`
--

DROP TABLE IF EXISTS `parties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parties` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
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
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_parties_org_name` (`organization_id`,`display_name`),
  KEY `idx_parties_status` (`status_code`),
  CONSTRAINT `fk_parties_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `partner_price_rules`
--

DROP TABLE IF EXISTS `partner_price_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partner_price_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_party_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `minimum_qty` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `special_price` decimal(18,2) DEFAULT NULL,
  `discount_percent` decimal(8,3) DEFAULT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_partner_price_party_product` (`partner_party_id`,`product_id`),
  KEY `fk_partner_price_product` (`product_id`),
  KEY `fk_partner_price_variant` (`variant_id`),
  CONSTRAINT `fk_partner_price_party` FOREIGN KEY (`partner_party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partner_price_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partner_price_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `party_contacts`
--

DROP TABLE IF EXISTS `party_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `party_contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `party_id` bigint unsigned NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `job_title` varchar(120) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `whatsapp` varchar(50) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_party_contacts_party` (`party_id`,`is_primary`),
  CONSTRAINT `fk_party_contacts_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `party_roles`
--

DROP TABLE IF EXISTS `party_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `party_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `party_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `role_code` varchar(50) NOT NULL COMMENT 'craft_customer|craft_partner|studio_client|supplier|vendor|freelancer|studio_partner',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_party_role` (`party_id`,`business_unit_id`,`role_code`),
  KEY `idx_party_roles_role` (`role_code`,`is_active`),
  KEY `fk_party_roles_bu` (`business_unit_id`),
  CONSTRAINT `fk_party_roles_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_party_roles_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `method_type` varchar(30) NOT NULL COMMENT 'cash|bank_transfer|ewallet|marketplace|other',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned NOT NULL,
  `payment_code` varchar(80) NOT NULL,
  `invoice_id` bigint unsigned DEFAULT NULL,
  `payment_schedule_id` bigint unsigned DEFAULT NULL,
  `party_id` bigint unsigned DEFAULT NULL,
  `payment_method_id` bigint unsigned DEFAULT NULL,
  `treasury_account_id` bigint unsigned DEFAULT NULL,
  `financial_transaction_id` bigint unsigned DEFAULT NULL,
  `payment_direction` varchar(20) NOT NULL DEFAULT 'in' COMMENT 'in|out',
  `payment_date` datetime(3) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `reference_number` varchar(190) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'confirmed' COMMENT 'pending|confirmed|failed|refunded|void',
  `notes` varchar(500) DEFAULT NULL,
  `received_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`),
  KEY `idx_payments_invoice` (`invoice_id`,`payment_date`),
  KEY `idx_payments_party` (`party_id`,`payment_date`),
  KEY `fk_payments_org` (`organization_id`),
  KEY `fk_payments_bu` (`business_unit_id`),
  KEY `fk_payments_schedule` (`payment_schedule_id`),
  KEY `fk_payments_method` (`payment_method_id`),
  KEY `fk_payments_treasury` (`treasury_account_id`),
  KEY `fk_payments_transaction` (`financial_transaction_id`),
  KEY `fk_payments_received_by` (`received_by`),
  CONSTRAINT `fk_payments_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_payments_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_received_by` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_schedule` FOREIGN KEY (`payment_schedule_id`) REFERENCES `invoice_payment_schedules` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_transaction` FOREIGN KEY (`financial_transaction_id`) REFERENCES `financial_transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_treasury` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(120) NOT NULL,
  `module_code` varchar(60) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `print_failures`
--

DROP TABLE IF EXISTS `print_failures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_failures` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `print_job_id` bigint unsigned NOT NULL,
  `failure_type` varchar(50) NOT NULL COMMENT 'spaghetti|layer_shift|warping|adhesion|filament|power|human_error|other',
  `failure_stage` varchar(50) DEFAULT NULL,
  `description` text,
  `material_wasted_g` decimal(12,3) DEFAULT NULL,
  `estimated_loss` decimal(18,2) DEFAULT NULL,
  `requires_reprint` tinyint(1) NOT NULL DEFAULT '1',
  `reprint_job_id` bigint unsigned DEFAULT NULL,
  `reported_by` bigint unsigned DEFAULT NULL,
  `occurred_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_print_failures_job` (`print_job_id`,`occurred_at`),
  KEY `fk_print_failures_reprint` (`reprint_job_id`),
  KEY `fk_print_failures_user` (`reported_by`),
  CONSTRAINT `fk_print_failures_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_print_failures_reprint` FOREIGN KEY (`reprint_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_failures_user` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `print_job_materials`
--

DROP TABLE IF EXISTS `print_job_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_job_materials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `print_job_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `material_batch_id` bigint unsigned DEFAULT NULL,
  `reservation_id` bigint unsigned DEFAULT NULL,
  `planned_qty` decimal(18,4) DEFAULT NULL,
  `actual_qty` decimal(18,4) DEFAULT NULL,
  `unit_id` bigint unsigned NOT NULL,
  `unit_cost` decimal(18,4) DEFAULT NULL,
  `actual_cost` decimal(18,2) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_print_job_material` (`print_job_id`,`material_id`,`material_batch_id`),
  KEY `fk_print_job_material_material` (`material_id`),
  KEY `fk_print_job_material_batch` (`material_batch_id`),
  KEY `fk_print_job_material_reservation` (`reservation_id`),
  KEY `fk_print_job_material_unit` (`unit_id`),
  CONSTRAINT `fk_print_job_material_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_job_material_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_print_job_material_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  CONSTRAINT `fk_print_job_material_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `stock_reservations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_job_material_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `print_job_status_history`
--

DROP TABLE IF EXISTS `print_job_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_job_status_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `print_job_id` bigint unsigned NOT NULL,
  `from_status_code` varchar(30) DEFAULT NULL,
  `to_status_code` varchar(30) NOT NULL,
  `progress_percent` decimal(6,2) DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `changed_by` bigint unsigned DEFAULT NULL,
  `changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_print_job_history_job` (`print_job_id`,`changed_at`),
  KEY `fk_print_job_history_user` (`changed_by`),
  CONSTRAINT `fk_print_job_history_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_print_job_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `print_jobs`
--

DROP TABLE IF EXISTS `print_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `job_code` varchar(80) NOT NULL,
  `queue_item_id` bigint unsigned DEFAULT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `order_item_id` bigint unsigned DEFAULT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `printer_id` bigint unsigned NOT NULL,
  `print_profile_id` bigint unsigned DEFAULT NULL,
  `design_file_id` bigint unsigned DEFAULT NULL,
  `job_name` varchar(200) NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `status_code` varchar(30) NOT NULL DEFAULT 'queued' COMMENT 'queued|ready|printing|paused|qc|completed|failed|cancelled',
  `queue_position` int unsigned DEFAULT NULL,
  `estimated_print_minutes` int unsigned DEFAULT NULL,
  `actual_print_minutes` int unsigned DEFAULT NULL,
  `estimated_material_g` decimal(12,3) DEFAULT NULL,
  `actual_material_g` decimal(12,3) DEFAULT NULL,
  `estimated_cost` decimal(18,2) DEFAULT NULL,
  `actual_cost` decimal(18,2) DEFAULT NULL,
  `scheduled_start_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) DEFAULT NULL,
  `estimated_finish_at` datetime(3) DEFAULT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `progress_percent` decimal(6,2) NOT NULL DEFAULT '0.00',
  `operator_user_id` bigint unsigned DEFAULT NULL,
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_code` (`job_code`),
  KEY `idx_print_jobs_printer_status` (`printer_id`,`status_code`),
  KEY `idx_print_jobs_order` (`order_id`,`order_item_id`),
  KEY `idx_print_jobs_schedule` (`status_code`,`scheduled_start_at`),
  KEY `fk_print_jobs_bu` (`business_unit_id`),
  KEY `fk_print_jobs_queue` (`queue_item_id`),
  KEY `fk_print_jobs_order_item` (`order_item_id`),
  KEY `fk_print_jobs_product` (`product_id`),
  KEY `fk_print_jobs_variant` (`variant_id`),
  KEY `fk_print_jobs_profile` (`print_profile_id`),
  KEY `fk_print_jobs_design` (`design_file_id`),
  KEY `fk_print_jobs_operator` (`operator_user_id`),
  CONSTRAINT `fk_print_jobs_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_print_jobs_design` FOREIGN KEY (`design_file_id`) REFERENCES `design_files` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_jobs_operator` FOREIGN KEY (`operator_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_jobs_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_jobs_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `craft_order_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_jobs_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`),
  CONSTRAINT `fk_print_jobs_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_jobs_profile` FOREIGN KEY (`print_profile_id`) REFERENCES `print_profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_jobs_queue` FOREIGN KEY (`queue_item_id`) REFERENCES `production_queue_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_jobs_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `print_profiles`
--

DROP TABLE IF EXISTS `print_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `printer_id` bigint unsigned DEFAULT NULL,
  `name` varchar(180) NOT NULL,
  `slicer_name` varchar(120) DEFAULT NULL,
  `nozzle_diameter_mm` decimal(6,3) DEFAULT NULL,
  `layer_height_mm` decimal(6,3) DEFAULT NULL,
  `infill_percent` decimal(6,2) DEFAULT NULL,
  `support_enabled` tinyint(1) DEFAULT NULL,
  `estimated_print_minutes` int unsigned DEFAULT NULL,
  `estimated_material_qty` decimal(18,4) DEFAULT NULL,
  `estimated_material_unit_id` bigint unsigned DEFAULT NULL,
  `settings_json` json DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_print_profiles_product` (`product_id`,`variant_id`),
  KEY `fk_print_profiles_bu` (`business_unit_id`),
  KEY `fk_print_profiles_variant` (`variant_id`),
  KEY `fk_print_profiles_printer` (`printer_id`),
  KEY `fk_print_profiles_unit` (`estimated_material_unit_id`),
  CONSTRAINT `fk_print_profiles_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_print_profiles_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_profiles_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_profiles_unit` FOREIGN KEY (`estimated_material_unit_id`) REFERENCES `units_of_measure` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_profiles_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `printer_issues`
--

DROP TABLE IF EXISTS `printer_issues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printer_issues` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `printer_id` bigint unsigned NOT NULL,
  `issue_code` varchar(60) NOT NULL,
  `title` varchar(180) NOT NULL,
  `severity_code` varchar(30) NOT NULL DEFAULT 'medium' COMMENT 'low|medium|high|critical',
  `status_code` varchar(30) NOT NULL DEFAULT 'open' COMMENT 'open|investigating|resolved|closed',
  `description` text,
  `reported_by` bigint unsigned DEFAULT NULL,
  `assigned_to` bigint unsigned DEFAULT NULL,
  `reported_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolved_at` datetime(3) DEFAULT NULL,
  `resolution_notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `issue_code` (`issue_code`),
  KEY `idx_printer_issues_status` (`printer_id`,`status_code`,`severity_code`),
  KEY `fk_printer_issues_reported_by` (`reported_by`),
  KEY `fk_printer_issues_assigned_to` (`assigned_to`),
  CONSTRAINT `fk_printer_issues_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_printer_issues_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_printer_issues_reported_by` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `printer_maintenance_records`
--

DROP TABLE IF EXISTS `printer_maintenance_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printer_maintenance_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `printer_id` bigint unsigned NOT NULL,
  `schedule_id` bigint unsigned DEFAULT NULL,
  `maintenance_type` varchar(100) NOT NULL,
  `performed_at` datetime(3) NOT NULL,
  `performed_by` bigint unsigned DEFAULT NULL,
  `cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `print_hours_at_service` decimal(14,2) DEFAULT NULL,
  `notes` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_printer_maintenance_printer_date` (`printer_id`,`performed_at`),
  KEY `fk_printer_maintenance_record_schedule` (`schedule_id`),
  KEY `fk_printer_maintenance_record_user` (`performed_by`),
  CONSTRAINT `fk_printer_maintenance_record_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_printer_maintenance_record_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `printer_maintenance_schedules` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_printer_maintenance_record_user` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `printer_maintenance_schedules`
--

DROP TABLE IF EXISTS `printer_maintenance_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printer_maintenance_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `printer_id` bigint unsigned NOT NULL,
  `maintenance_type` varchar(100) NOT NULL,
  `trigger_type` varchar(30) NOT NULL COMMENT 'date|print_hours|job_count',
  `interval_value` decimal(12,2) DEFAULT NULL,
  `next_due_at` datetime(3) DEFAULT NULL,
  `next_due_print_hours` decimal(14,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_printer_maintenance_schedule` (`printer_id`),
  CONSTRAINT `fk_printer_maintenance_schedule` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `printers`
--

DROP TABLE IF EXISTS `printers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
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
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_printers_bu_status` (`business_unit_id`,`status_code`),
  CONSTRAINT `fk_printers_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_bom_items`
--

DROP TABLE IF EXISTS `product_bom_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_bom_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bom_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint unsigned NOT NULL,
  `waste_factor_percent` decimal(8,3) NOT NULL DEFAULT '0.000',
  `is_optional` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bom_material` (`bom_id`,`material_id`),
  KEY `fk_product_bom_items_material` (`material_id`),
  KEY `fk_product_bom_items_unit` (`unit_id`),
  CONSTRAINT `fk_product_bom_items_bom` FOREIGN KEY (`bom_id`) REFERENCES `product_boms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_bom_items_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  CONSTRAINT `fk_product_bom_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_boms`
--

DROP TABLE IF EXISTS `product_boms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_boms` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `version_no` int unsigned NOT NULL DEFAULT '1',
  `name` varchar(180) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_bom_version` (`product_id`,`variant_id`,`version_no`),
  KEY `fk_product_boms_variant` (`variant_id`),
  CONSTRAINT `fk_product_boms_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_boms_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(120) NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_category` (`business_unit_id`,`code`),
  KEY `fk_product_categories_parent` (`parent_id`),
  CONSTRAINT `fk_product_categories_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_product_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `sku` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `attributes` json DEFAULT NULL COMMENT 'color,size,material,etc',
  `selling_price` decimal(18,2) DEFAULT NULL,
  `estimated_cost` decimal(18,2) DEFAULT NULL,
  `estimated_weight_g` decimal(12,3) DEFAULT NULL,
  `estimated_print_minutes` int unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `fk_product_variants_product` (`product_id`),
  CONSTRAINT `fk_product_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_queue_items`
--

DROP TABLE IF EXISTS `production_queue_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_queue_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `order_id` bigint unsigned NOT NULL,
  `order_item_id` bigint unsigned NOT NULL,
  `queue_position` int unsigned NOT NULL,
  `priority_code` varchar(20) NOT NULL DEFAULT 'normal',
  `priority_score` decimal(10,3) NOT NULL DEFAULT '0.000',
  `scheduled_start_at` datetime(3) DEFAULT NULL,
  `scheduled_end_at` datetime(3) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'queued' COMMENT 'queued|scheduled|printing|completed|cancelled',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(500) DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_queue_active_item` (`order_item_id`,`status_code`),
  KEY `idx_production_queue_ordering` (`status_code`,`queue_position`,`priority_score`),
  KEY `fk_production_queue_bu` (`business_unit_id`),
  KEY `fk_production_queue_order` (`order_id`),
  KEY `fk_production_queue_user` (`created_by`),
  CONSTRAINT `fk_production_queue_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_production_queue_item` FOREIGN KEY (`order_item_id`) REFERENCES `craft_order_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_production_queue_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_production_queue_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `sku` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` text,
  `product_type` varchar(30) NOT NULL DEFAULT 'premade' COMMENT 'premade|customizable|custom_service',
  `base_selling_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `estimated_cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `estimated_weight_g` decimal(12,3) DEFAULT NULL,
  `estimated_print_minutes` int unsigned DEFAULT NULL,
  `default_margin_percent` decimal(8,3) DEFAULT NULL,
  `image_path` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_products_bu_category` (`business_unit_id`,`category_id`),
  KEY `idx_products_name` (`name`),
  KEY `fk_products_category` (`category_id`),
  CONSTRAINT `fk_products_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_deliverables`
--

DROP TABLE IF EXISTS `project_deliverables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_deliverables` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `milestone_id` bigint unsigned DEFAULT NULL,
  `title` varchar(180) NOT NULL,
  `description` text,
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|submitted|revision|approved|delivered',
  `due_at` datetime(3) DEFAULT NULL,
  `delivered_at` datetime(3) DEFAULT NULL,
  `storage_path` varchar(500) DEFAULT NULL,
  `external_url` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_project_deliverables_project` (`project_id`,`status_code`),
  KEY `fk_project_deliverables_milestone` (`milestone_id`),
  CONSTRAINT `fk_project_deliverables_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `project_milestones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_project_deliverables_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_external_assignments`
--

DROP TABLE IF EXISTS `project_external_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_external_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `party_id` bigint unsigned NOT NULL,
  `assignment_role` varchar(100) NOT NULL COMMENT 'vendor|freelancer|partner|talent|other',
  `scope_description` text,
  `agreed_fee` decimal(18,2) NOT NULL DEFAULT '0.00',
  `payment_status_code` varchar(30) NOT NULL DEFAULT 'unpaid',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_project_external_party` (`project_id`,`party_id`),
  KEY `fk_project_external_party` (`party_id`),
  CONSTRAINT `fk_project_external_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `fk_project_external_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_milestones`
--

DROP TABLE IF EXISTS `project_milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_milestones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text,
  `due_at` datetime(3) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|in_progress|completed|late|cancelled',
  `sort_order` int NOT NULL DEFAULT '0',
  `completed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_project_milestones_project_due` (`project_id`,`due_at`),
  CONSTRAINT `fk_project_milestones_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purchase_order_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint unsigned DEFAULT NULL,
  `unit_price` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `received_qty` decimal(18,4) NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`id`),
  KEY `fk_purchase_order_items_order` (`purchase_order_id`),
  KEY `fk_purchase_order_items_material` (`material_id`),
  KEY `fk_purchase_order_items_unit` (`unit_id`),
  CONSTRAINT `fk_purchase_order_items_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_purchase_order_items_order` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_purchase_order_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `po_number` varchar(80) NOT NULL,
  `supplier_party_id` bigint unsigned NOT NULL,
  `purchase_request_id` bigint unsigned DEFAULT NULL,
  `order_date` date NOT NULL,
  `expected_date` date DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'draft' COMMENT 'draft|sent|confirmed|partial|received|cancelled|closed',
  `currency_code` char(3) NOT NULL DEFAULT 'IDR',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `shipping_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `notes` text,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_number` (`po_number`),
  KEY `idx_purchase_orders_supplier_date` (`supplier_party_id`,`order_date`),
  KEY `fk_purchase_orders_bu` (`business_unit_id`),
  KEY `fk_purchase_orders_request` (`purchase_request_id`),
  KEY `fk_purchase_orders_user` (`created_by`),
  CONSTRAINT `fk_purchase_orders_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_purchase_orders_request` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_purchase_orders_supplier` FOREIGN KEY (`supplier_party_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `fk_purchase_orders_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_request_items`
--

DROP TABLE IF EXISTS `purchase_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_request_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purchase_request_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint unsigned DEFAULT NULL,
  `estimated_unit_cost` decimal(18,4) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_purchase_request_items_request` (`purchase_request_id`),
  KEY `fk_purchase_request_items_material` (`material_id`),
  KEY `fk_purchase_request_items_unit` (`unit_id`),
  CONSTRAINT `fk_purchase_request_items_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_purchase_request_items_request` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_purchase_request_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_requests`
--

DROP TABLE IF EXISTS `purchase_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `request_code` varchar(80) NOT NULL,
  `requested_by` bigint unsigned DEFAULT NULL,
  `requested_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `required_by` date DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'draft' COMMENT 'draft|submitted|approved|rejected|ordered|closed',
  `purpose` varchar(500) DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_code` (`request_code`),
  KEY `fk_purchase_requests_bu` (`business_unit_id`),
  KEY `fk_purchase_requests_requested_by` (`requested_by`),
  KEY `fk_purchase_requests_approved_by` (`approved_by`),
  CONSTRAINT `fk_purchase_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_purchase_requests_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_purchase_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_inspection_items`
--

DROP TABLE IF EXISTS `qc_inspection_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_inspection_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inspection_id` bigint unsigned NOT NULL,
  `template_item_id` bigint unsigned DEFAULT NULL,
  `item_label` varchar(150) NOT NULL,
  `value_text` text,
  `passed` tinyint(1) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_qc_inspection_items_inspection` (`inspection_id`),
  KEY `fk_qc_inspection_items_template_item` (`template_item_id`),
  CONSTRAINT `fk_qc_inspection_items_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `qc_inspections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qc_inspection_items_template_item` FOREIGN KEY (`template_item_id`) REFERENCES `qc_template_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_inspections`
--

DROP TABLE IF EXISTS `qc_inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_inspections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `print_job_id` bigint unsigned NOT NULL,
  `template_id` bigint unsigned DEFAULT NULL,
  `inspector_user_id` bigint unsigned DEFAULT NULL,
  `result_code` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|pass|fail|conditional',
  `notes` text,
  `inspected_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_qc_inspections_job` (`print_job_id`),
  KEY `fk_qc_inspections_template` (`template_id`),
  KEY `fk_qc_inspections_user` (`inspector_user_id`),
  CONSTRAINT `fk_qc_inspections_job` FOREIGN KEY (`print_job_id`) REFERENCES `print_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qc_inspections_template` FOREIGN KEY (`template_id`) REFERENCES `qc_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_qc_inspections_user` FOREIGN KEY (`inspector_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_template_items`
--

DROP TABLE IF EXISTS `qc_template_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_template_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `template_id` bigint unsigned NOT NULL,
  `item_code` varchar(60) NOT NULL,
  `label` varchar(150) NOT NULL,
  `check_type` varchar(30) NOT NULL DEFAULT 'boolean' COMMENT 'boolean|number|text|select',
  `required` tinyint(1) NOT NULL DEFAULT '1',
  `config_json` json DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_qc_template_item` (`template_id`,`item_code`),
  CONSTRAINT `fk_qc_template_items_template` FOREIGN KEY (`template_id`) REFERENCES `qc_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_templates`
--

DROP TABLE IF EXISTS `qc_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_qc_templates_bu` (`business_unit_id`),
  CONSTRAINT `fk_qc_templates_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quick_links`
--

DROP TABLE IF EXISTS `quick_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quick_links` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `label` varchar(120) NOT NULL,
  `url` varchar(500) NOT NULL,
  `icon_key` varchar(60) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_quick_links_org` (`organization_id`),
  KEY `fk_quick_links_bu` (`business_unit_id`),
  CONSTRAINT `fk_quick_links_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quick_links_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quotation_items`
--

DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `quotation_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned DEFAULT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `unit_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_quotation_items_quotation` (`quotation_id`),
  KEY `fk_quotation_items_service` (`service_id`),
  KEY `fk_quotation_items_product` (`product_id`),
  CONSTRAINT `fk_quotation_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotation_items_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotation_items_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quotation_template_items`
--

DROP TABLE IF EXISTS `quotation_template_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_template_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `template_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned DEFAULT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `default_quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `default_unit_price` decimal(18,2) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_quotation_template_items_template` (`template_id`),
  KEY `fk_quotation_template_items_service` (`service_id`),
  KEY `fk_quotation_template_items_product` (`product_id`),
  CONSTRAINT `fk_quotation_template_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotation_template_items_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotation_template_items_template` FOREIGN KEY (`template_id`) REFERENCES `quotation_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quotation_templates`
--

DROP TABLE IF EXISTS `quotation_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `template_code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `title_template` varchar(220) DEFAULT NULL,
  `intro_text` text,
  `terms_text` text,
  `footer_text` text,
  `default_valid_days` int unsigned NOT NULL DEFAULT '14',
  `config_json` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_code` (`template_code`),
  KEY `fk_quotation_templates_org` (`organization_id`),
  KEY `fk_quotation_templates_bu` (`business_unit_id`),
  KEY `fk_quotation_templates_user` (`created_by`),
  CONSTRAINT `fk_quotation_templates_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotation_templates_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_quotation_templates_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned NOT NULL,
  `quotation_number` varchar(80) NOT NULL,
  `party_id` bigint unsigned NOT NULL,
  `project_id` bigint unsigned DEFAULT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
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
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `quotation_number` (`quotation_number`),
  KEY `idx_quotations_party_status` (`party_id`,`status_code`),
  KEY `fk_quotations_org` (`organization_id`),
  KEY `fk_quotations_bu` (`business_unit_id`),
  KEY `fk_quotations_project` (`project_id`),
  KEY `fk_quotations_order` (`order_id`),
  KEY `fk_quotations_user` (`created_by`),
  CONSTRAINT `fk_quotations_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_quotations_order` FOREIGN KEY (`order_id`) REFERENCES `craft_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotations_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_quotations_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `fk_quotations_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotations_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `report_definitions`
--

DROP TABLE IF EXISTS `report_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_definitions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `report_code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `report_type` varchar(60) NOT NULL,
  `config_json` json DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_code` (`report_code`),
  KEY `fk_report_definitions_org` (`organization_id`),
  KEY `fk_report_definitions_bu` (`business_unit_id`),
  KEY `fk_report_definitions_user` (`created_by`),
  CONSTRAINT `fk_report_definitions_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_report_definitions_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_report_definitions_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `report_exports`
--

DROP TABLE IF EXISTS `report_exports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_exports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `report_definition_id` bigint unsigned DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `report_name` varchar(180) NOT NULL,
  `export_format` varchar(20) NOT NULL COMMENT 'pdf|xlsx|csv',
  `filter_json` json DEFAULT NULL,
  `storage_path` varchar(500) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'generated' COMMENT 'queued|generating|generated|failed',
  `generated_by` bigint unsigned DEFAULT NULL,
  `generated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_report_exports_definition` (`report_definition_id`),
  KEY `fk_report_exports_org` (`organization_id`),
  KEY `fk_report_exports_bu` (`business_unit_id`),
  KEY `fk_report_exports_user` (`generated_by`),
  CONSTRAINT `fk_report_exports_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_report_exports_definition` FOREIGN KEY (`report_definition_id`) REFERENCES `report_definitions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_report_exports_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_report_exports_user` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `scope_code` varchar(30) NOT NULL DEFAULT 'global' COMMENT 'global|craft|studio',
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_org_code` (`organization_id`,`code`),
  CONSTRAINT `fk_roles_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_channels`
--

DROP TABLE IF EXISTS `sales_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_channels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `channel_type` varchar(30) NOT NULL COMMENT 'marketplace|direct|partner|internal',
  `external_url` varchar(500) DEFAULT NULL,
  `is_integrated` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sales_channel` (`business_unit_id`,`code`),
  CONSTRAINT `fk_sales_channels_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `service_package_items`
--

DROP TABLE IF EXISTS `service_package_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_package_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `package_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_package_item` (`package_id`,`service_id`),
  KEY `fk_service_package_items_service` (`service_id`),
  CONSTRAINT `fk_service_package_items_package` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_service_package_items_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `service_packages`
--

DROP TABLE IF EXISTS `service_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_packages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` text,
  `package_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `fk_service_packages_bu` (`business_unit_id`),
  CONSTRAINT `fk_service_packages_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stock_reservations`
--

DROP TABLE IF EXISTS `stock_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_reservations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_id` bigint unsigned NOT NULL,
  `material_batch_id` bigint unsigned DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_id` bigint unsigned NOT NULL,
  `reference_type` varchar(60) NOT NULL COMMENT 'craft_order|order_item|production_queue|print_job',
  `reference_id` bigint unsigned NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'reserved' COMMENT 'reserved|consumed|released|cancelled',
  `reserved_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` datetime(3) DEFAULT NULL,
  `released_at` datetime(3) DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stock_reservation_ref` (`reference_type`,`reference_id`,`status_code`),
  KEY `fk_stock_reservation_material` (`material_id`),
  KEY `fk_stock_reservation_batch` (`material_batch_id`),
  KEY `fk_stock_reservation_unit` (`unit_id`),
  KEY `fk_stock_reservation_user` (`created_by`),
  CONSTRAINT `fk_stock_reservation_batch` FOREIGN KEY (`material_batch_id`) REFERENCES `material_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_stock_reservation_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  CONSTRAINT `fk_stock_reservation_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`),
  CONSTRAINT `fk_stock_reservation_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `studio_project_members`
--

DROP TABLE IF EXISTS `studio_project_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `studio_project_members` (
  `project_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `role_label` varchar(100) DEFAULT NULL,
  `allocation_percent` decimal(6,2) DEFAULT NULL,
  `joined_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `left_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`project_id`,`user_id`),
  KEY `fk_project_members_user` (`user_id`),
  CONSTRAINT `fk_project_members_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `studio_project_services`
--

DROP TABLE IF EXISTS `studio_project_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `studio_project_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned DEFAULT NULL,
  `package_id` bigint unsigned DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT '1.0000',
  `unit_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_project_services_project` (`project_id`),
  KEY `fk_project_services_service` (`service_id`),
  KEY `fk_project_services_package` (`package_id`),
  CONSTRAINT `fk_project_services_package` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_project_services_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_services_service` FOREIGN KEY (`service_id`) REFERENCES `studio_services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `studio_project_status_history`
--

DROP TABLE IF EXISTS `studio_project_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `studio_project_status_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `from_status_code` varchar(30) DEFAULT NULL,
  `to_status_code` varchar(30) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `changed_by` bigint unsigned DEFAULT NULL,
  `changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_project_status_history` (`project_id`,`changed_at`),
  KEY `fk_project_status_history_user` (`changed_by`),
  CONSTRAINT `fk_project_status_history_project` FOREIGN KEY (`project_id`) REFERENCES `studio_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `studio_projects`
--

DROP TABLE IF EXISTS `studio_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `studio_projects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `project_code` varchar(80) NOT NULL,
  `client_party_id` bigint unsigned NOT NULL,
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
  `project_manager_user_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_code` (`project_code`),
  KEY `idx_studio_projects_status_deadline` (`status_code`,`deadline_at`),
  KEY `idx_studio_projects_client` (`client_party_id`,`created_at`),
  KEY `fk_studio_projects_bu` (`business_unit_id`),
  KEY `fk_studio_projects_pm` (`project_manager_user_id`),
  KEY `fk_studio_projects_created_by` (`created_by`),
  CONSTRAINT `fk_studio_projects_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_studio_projects_client` FOREIGN KEY (`client_party_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `fk_studio_projects_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_studio_projects_pm` FOREIGN KEY (`project_manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `studio_service_categories`
--

DROP TABLE IF EXISTS `studio_service_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `studio_service_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(120) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_studio_service_category` (`business_unit_id`,`code`),
  CONSTRAINT `fk_studio_service_category_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `studio_services`
--

DROP TABLE IF EXISTS `studio_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `studio_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` text,
  `pricing_model` varchar(30) NOT NULL DEFAULT 'fixed' COMMENT 'fixed|hourly|daily|package|custom',
  `base_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `unit_label` varchar(60) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `fk_studio_services_bu` (`business_unit_id`),
  KEY `fk_studio_services_category` (`category_id`),
  CONSTRAINT `fk_studio_services_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_studio_services_category` FOREIGN KEY (`category_id`) REFERENCES `studio_service_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `supplier_invoices`
--

DROP TABLE IF EXISTS `supplier_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_unit_id` bigint unsigned NOT NULL,
  `supplier_party_id` bigint unsigned NOT NULL,
  `purchase_order_id` bigint unsigned DEFAULT NULL,
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
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_supplier_invoice` (`supplier_party_id`,`supplier_invoice_number`),
  KEY `idx_supplier_invoices_due` (`status_code`,`due_date`),
  KEY `fk_supplier_invoices_bu` (`business_unit_id`),
  KEY `fk_supplier_invoices_po` (`purchase_order_id`),
  CONSTRAINT `fk_supplier_invoices_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`),
  CONSTRAINT `fk_supplier_invoices_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_supplier_invoices_supplier` FOREIGN KEY (`supplier_party_id`) REFERENCES `parties` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `setting_group` varchar(80) NOT NULL,
  `setting_key` varchar(120) NOT NULL,
  `setting_value` json DEFAULT NULL,
  `is_secret` tinyint(1) NOT NULL DEFAULT '0',
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_system_setting` (`organization_id`,`business_unit_id`,`setting_group`,`setting_key`),
  KEY `fk_system_settings_bu` (`business_unit_id`),
  KEY `fk_system_settings_user` (`updated_by`),
  CONSTRAINT `fk_system_settings_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_system_settings_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_system_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_assignees`
--

DROP TABLE IF EXISTS `task_assignees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_assignees` (
  `task_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `assigned_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`task_id`,`user_id`),
  KEY `fk_task_assignees_user` (`user_id`),
  CONSTRAINT `fk_task_assignees_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_assignees_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `task_code` varchar(80) DEFAULT NULL,
  `title` varchar(220) NOT NULL,
  `description` text,
  `status_code` varchar(30) NOT NULL DEFAULT 'todo' COMMENT 'todo|in_progress|blocked|done|cancelled',
  `priority_code` varchar(20) NOT NULL DEFAULT 'normal',
  `due_at` datetime(3) DEFAULT NULL,
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `completed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_code` (`task_code`),
  KEY `idx_tasks_status_due` (`status_code`,`due_at`),
  KEY `fk_tasks_org` (`organization_id`),
  KEY `fk_tasks_bu` (`business_unit_id`),
  KEY `fk_tasks_created_by` (`created_by`),
  CONSTRAINT `fk_tasks_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transaction_categories`
--

DROP TABLE IF EXISTS `transaction_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `transaction_type` varchar(30) NOT NULL COMMENT 'income|expense|transfer|adjustment',
  `default_coa_account_id` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_transaction_category` (`organization_id`,`business_unit_id`,`code`),
  KEY `fk_transaction_categories_bu` (`business_unit_id`),
  KEY `fk_transaction_categories_coa` (`default_coa_account_id`),
  CONSTRAINT `fk_transaction_categories_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transaction_categories_coa` FOREIGN KEY (`default_coa_account_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transaction_categories_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `treasury_accounts`
--

DROP TABLE IF EXISTS `treasury_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `treasury_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL,
  `coa_account_id` bigint unsigned DEFAULT NULL,
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
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_code` (`account_code`),
  KEY `fk_treasury_accounts_org` (`organization_id`),
  KEY `fk_treasury_accounts_bu` (`business_unit_id`),
  KEY `fk_treasury_accounts_coa` (`coa_account_id`),
  CONSTRAINT `fk_treasury_accounts_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_treasury_accounts_coa` FOREIGN KEY (`coa_account_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_treasury_accounts_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `units_of_measure`
--

DROP TABLE IF EXISTS `units_of_measure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units_of_measure` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(60) NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `unit_group` varchar(30) NOT NULL COMMENT 'weight|count|length|volume|time|other',
  `decimal_places` tinyint unsigned NOT NULL DEFAULT '2',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_business_units`
--

DROP TABLE IF EXISTS `user_business_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_business_units` (
  `user_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned NOT NULL,
  `can_access` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`,`business_unit_id`),
  KEY `fk_user_bu_unit` (`business_unit_id`),
  CONSTRAINT `fk_user_bu_unit` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_bu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `business_unit_id` bigint unsigned DEFAULT NULL COMMENT 'NULL = role applies globally',
  `assigned_by` bigint unsigned DEFAULT NULL,
  `assigned_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_role_scope` (`user_id`,`role_id`,`business_unit_id`),
  KEY `idx_user_roles_bu` (`business_unit_id`),
  KEY `fk_user_roles_role` (`role_id`),
  KEY `fk_user_roles_assigned_by` (`assigned_by`),
  CONSTRAINT `fk_user_roles_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_roles_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `session_token_hash` varchar(255) NOT NULL,
  `refresh_token_hash` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `device_name` varchar(150) DEFAULT NULL,
  `expires_at` datetime(3) NOT NULL,
  `revoked_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_seen_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token_hash` (`session_token_hash`),
  UNIQUE KEY `refresh_token_hash` (`refresh_token_hash`),
  KEY `idx_user_sessions_user` (`user_id`,`expires_at`),
  CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `employee_code` varchar(50) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `avatar_path` varchar(500) DEFAULT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'active' COMMENT 'active|inactive|suspended',
  `default_workspace_code` varchar(30) NOT NULL DEFAULT 'craft' COMMENT 'craft|studio',
  `email_verified_at` datetime(3) DEFAULT NULL,
  `last_login_at` datetime(3) DEFAULT NULL,
  `password_changed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `employee_code` (`employee_code`),
  KEY `idx_users_org_status` (`organization_id`,`status_code`),
  CONSTRAINT `fk_users_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_accounts_payable`
--

DROP TABLE IF EXISTS `v_accounts_payable`;
/*!50001 DROP VIEW IF EXISTS `v_accounts_payable`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_accounts_payable` AS SELECT 
 1 AS `supplier_invoice_id`,
 1 AS `business_unit_id`,
 1 AS `supplier_invoice_number`,
 1 AS `supplier_party_id`,
 1 AS `supplier_name`,
 1 AS `invoice_date`,
 1 AS `due_date`,
 1 AS `status_code`,
 1 AS `total_amount`,
 1 AS `paid_amount`,
 1 AS `balance_due`,
 1 AS `days_overdue`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_accounts_receivable`
--

DROP TABLE IF EXISTS `v_accounts_receivable`;
/*!50001 DROP VIEW IF EXISTS `v_accounts_receivable`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_accounts_receivable` AS SELECT 
 1 AS `invoice_id`,
 1 AS `business_unit_id`,
 1 AS `invoice_number`,
 1 AS `party_id`,
 1 AS `party_name`,
 1 AS `issue_date`,
 1 AS `due_date`,
 1 AS `status_code`,
 1 AS `total_amount`,
 1 AS `paid_amount`,
 1 AS `balance_due`,
 1 AS `days_overdue`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_craft_order_priority`
--

DROP TABLE IF EXISTS `v_craft_order_priority`;
/*!50001 DROP VIEW IF EXISTS `v_craft_order_priority`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_craft_order_priority` AS SELECT 
 1 AS `id`,
 1 AS `order_code`,
 1 AS `customer_party_id`,
 1 AS `customer_name`,
 1 AS `sales_channel_id`,
 1 AS `sales_channel_name`,
 1 AS `order_date`,
 1 AS `deadline_at`,
 1 AS `priority_code`,
 1 AS `priority_score`,
 1 AS `status_code`,
 1 AS `payment_status_code`,
 1 AS `total_amount`,
 1 AS `minutes_to_deadline`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_material_stock`
--

DROP TABLE IF EXISTS `v_material_stock`;
/*!50001 DROP VIEW IF EXISTS `v_material_stock`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_material_stock` AS SELECT 
 1 AS `material_id`,
 1 AS `business_unit_id`,
 1 AS `sku`,
 1 AS `name`,
 1 AS `material_type`,
 1 AS `color_name`,
 1 AS `unit_symbol`,
 1 AS `total_qty`,
 1 AS `reserved_qty`,
 1 AS `available_qty`,
 1 AS `low_stock_threshold`,
 1 AS `stock_status`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_printer_current_activity`
--

DROP TABLE IF EXISTS `v_printer_current_activity`;
/*!50001 DROP VIEW IF EXISTS `v_printer_current_activity`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_printer_current_activity` AS SELECT 
 1 AS `printer_id`,
 1 AS `printer_code`,
 1 AS `printer_name`,
 1 AS `printer_status`,
 1 AS `print_job_id`,
 1 AS `job_code`,
 1 AS `job_name`,
 1 AS `job_status`,
 1 AS `progress_percent`,
 1 AS `started_at`,
 1 AS `estimated_finish_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `v_accounts_payable`
--

/*!50001 DROP VIEW IF EXISTS `v_accounts_payable`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_accounts_payable` AS select `si`.`id` AS `supplier_invoice_id`,`si`.`business_unit_id` AS `business_unit_id`,`si`.`supplier_invoice_number` AS `supplier_invoice_number`,`si`.`supplier_party_id` AS `supplier_party_id`,`p`.`display_name` AS `supplier_name`,`si`.`invoice_date` AS `invoice_date`,`si`.`due_date` AS `due_date`,`si`.`status_code` AS `status_code`,`si`.`total_amount` AS `total_amount`,`si`.`paid_amount` AS `paid_amount`,`si`.`balance_due` AS `balance_due`,(to_days(curdate()) - to_days(`si`.`due_date`)) AS `days_overdue` from (`supplier_invoices` `si` join `parties` `p` on((`p`.`id` = `si`.`supplier_party_id`))) where ((`si`.`balance_due` > 0) and (`si`.`status_code` not in ('void','paid'))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_accounts_receivable`
--

/*!50001 DROP VIEW IF EXISTS `v_accounts_receivable`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_accounts_receivable` AS select `i`.`id` AS `invoice_id`,`i`.`business_unit_id` AS `business_unit_id`,`i`.`invoice_number` AS `invoice_number`,`i`.`party_id` AS `party_id`,`p`.`display_name` AS `party_name`,`i`.`issue_date` AS `issue_date`,`i`.`due_date` AS `due_date`,`i`.`status_code` AS `status_code`,`i`.`total_amount` AS `total_amount`,`i`.`paid_amount` AS `paid_amount`,`i`.`balance_due` AS `balance_due`,(to_days(curdate()) - to_days(`i`.`due_date`)) AS `days_overdue` from (`invoices` `i` join `parties` `p` on((`p`.`id` = `i`.`party_id`))) where ((`i`.`balance_due` > 0) and (`i`.`status_code` not in ('void','refunded','paid'))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_craft_order_priority`
--

/*!50001 DROP VIEW IF EXISTS `v_craft_order_priority`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_craft_order_priority` AS select `o`.`id` AS `id`,`o`.`order_code` AS `order_code`,`o`.`customer_party_id` AS `customer_party_id`,`p`.`display_name` AS `customer_name`,`o`.`sales_channel_id` AS `sales_channel_id`,`sc`.`name` AS `sales_channel_name`,`o`.`order_date` AS `order_date`,`o`.`deadline_at` AS `deadline_at`,`o`.`priority_code` AS `priority_code`,`o`.`priority_score` AS `priority_score`,`o`.`status_code` AS `status_code`,`o`.`payment_status_code` AS `payment_status_code`,`o`.`total_amount` AS `total_amount`,timestampdiff(MINUTE,utc_timestamp(),`o`.`deadline_at`) AS `minutes_to_deadline` from ((`craft_orders` `o` join `parties` `p` on((`p`.`id` = `o`.`customer_party_id`))) join `sales_channels` `sc` on((`sc`.`id` = `o`.`sales_channel_id`))) where ((`o`.`deleted_at` is null) and (`o`.`status_code` not in ('completed','cancelled','returned','shipped'))) order by `o`.`priority_score` desc,`o`.`deadline_at`,`o`.`order_date` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_material_stock`
--

/*!50001 DROP VIEW IF EXISTS `v_material_stock`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_material_stock` AS select `m`.`id` AS `material_id`,`m`.`business_unit_id` AS `business_unit_id`,`m`.`sku` AS `sku`,`m`.`name` AS `name`,`m`.`material_type` AS `material_type`,`m`.`color_name` AS `color_name`,`u`.`symbol` AS `unit_symbol`,coalesce(sum(`mb`.`current_qty`),0) AS `total_qty`,coalesce(sum(`mb`.`reserved_qty`),0) AS `reserved_qty`,coalesce(sum((`mb`.`current_qty` - `mb`.`reserved_qty`)),0) AS `available_qty`,`m`.`low_stock_threshold` AS `low_stock_threshold`,(case when (coalesce(sum((`mb`.`current_qty` - `mb`.`reserved_qty`)),0) <= 0) then 'out_of_stock' when (coalesce(sum((`mb`.`current_qty` - `mb`.`reserved_qty`)),0) <= `m`.`low_stock_threshold`) then 'low_stock' else 'normal' end) AS `stock_status` from ((`materials` `m` join `units_of_measure` `u` on((`u`.`id` = `m`.`base_unit_id`))) left join `material_batches` `mb` on(((`mb`.`material_id` = `m`.`id`) and (`mb`.`status_code` <> 'closed')))) where (`m`.`deleted_at` is null) group by `m`.`id`,`m`.`business_unit_id`,`m`.`sku`,`m`.`name`,`m`.`material_type`,`m`.`color_name`,`u`.`symbol`,`m`.`low_stock_threshold` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_printer_current_activity`
--

/*!50001 DROP VIEW IF EXISTS `v_printer_current_activity`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_printer_current_activity` AS select `p`.`id` AS `printer_id`,`p`.`code` AS `printer_code`,`p`.`name` AS `printer_name`,`p`.`status_code` AS `printer_status`,`pj`.`id` AS `print_job_id`,`pj`.`job_code` AS `job_code`,`pj`.`job_name` AS `job_name`,`pj`.`status_code` AS `job_status`,`pj`.`progress_percent` AS `progress_percent`,`pj`.`started_at` AS `started_at`,`pj`.`estimated_finish_at` AS `estimated_finish_at` from (`printers` `p` left join `print_jobs` `pj` on(((`pj`.`printer_id` = `p`.`id`) and (`pj`.`status_code` in ('printing','paused'))))) where (`p`.`deleted_at` is null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-22 15:09:58
