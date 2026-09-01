-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 01, 2026 at 03:29 AM
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
(49, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 12:17:47.926'),
(84, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 13:16:24.485'),
(127, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 14:59:44.108'),
(134, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 15:31:09.659'),
(135, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 15:57:55.904'),
(136, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 16:05:16.181'),
(192, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 20:13:25.623'),
(238, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 20:52:12.331'),
(358, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 22:14:12.439'),
(359, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 22:20:49.446'),
(363, 1, 2, 2, 'studio_projects', 'studio.project_external_add', 'studio_project', 25, 'SMK-VND-C67914F7', 'Menambahkan kolaborator eksternal Vendor Smoke C67914F7 pada proyek SMK-VND-C67914F7.', NULL, '{\"party_id\": 43, \"agreed_fee\": 2000000, \"assignment_role\": \"freelancer\"}', NULL, NULL, '2026-08-27 22:54:08.269'),
(365, 1, 2, 2, 'studio_projects', 'studio.project_external_update', 'studio_project', 25, 'SMK-VND-C67914F7', 'Memperbarui penugasan eksternal pada proyek SMK-VND-C67914F7.', '{\"agreed_fee\": 2000000, \"assignment_role\": \"freelancer\"}', '{\"agreed_fee\": 2100000, \"assignment_role\": \"freelancer\"}', NULL, NULL, '2026-08-27 22:54:08.297'),
(367, 1, 2, 2, 'studio_projects', 'studio.project_external_end', 'studio_project', 25, 'SMK-VND-C67914F7', 'Mengakhiri penugasan eksternal pada proyek SMK-VND-C67914F7.', NULL, '{\"id\": 3, \"end_date\": \"2026-08-02\"}', NULL, NULL, '2026-08-27 22:54:08.318'),
(371, 1, 2, 2, 'studio_vendors', 'studio.external_party_adopt', 'party', 44, 'CLI-000044', 'Mengadopsi Party CLI-000044 sebagai pihak eksternal Studio.', NULL, '{\"roles\": [\"studio_partner\"], \"contacts\": 0}', NULL, NULL, '2026-08-27 22:54:08.402'),
(382, 1, 2, 2, 'studio_projects', 'studio.project_external_add', 'studio_project', 26, 'SMK-VND-F555E367', 'Menambahkan kolaborator eksternal Vendor Smoke F555E367 pada proyek SMK-VND-F555E367.', NULL, '{\"party_id\": 52, \"agreed_fee\": 2000000, \"assignment_role\": \"freelancer\"}', NULL, NULL, '2026-08-27 23:03:04.433'),
(384, 1, 2, 2, 'studio_projects', 'studio.project_external_update', 'studio_project', 26, 'SMK-VND-F555E367', 'Memperbarui penugasan eksternal pada proyek SMK-VND-F555E367.', '{\"agreed_fee\": 2000000, \"assignment_role\": \"freelancer\"}', '{\"agreed_fee\": 2100000, \"assignment_role\": \"freelancer\"}', NULL, NULL, '2026-08-27 23:03:04.463'),
(386, 1, 2, 2, 'studio_projects', 'studio.project_external_end', 'studio_project', 26, 'SMK-VND-F555E367', 'Mengakhiri penugasan eksternal pada proyek SMK-VND-F555E367.', NULL, '{\"id\": 4, \"end_date\": \"2026-08-02\"}', NULL, NULL, '2026-08-27 23:03:04.481'),
(390, 1, 2, 2, 'studio_vendors', 'studio.external_party_adopt', 'party', 53, 'CLI-000053', 'Mengadopsi Party CLI-000053 sebagai pihak eksternal Studio.', NULL, '{\"roles\": [\"studio_partner\"], \"contacts\": 0}', NULL, NULL, '2026-08-27 23:03:04.550'),
(391, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 23:04:45.343'),
(392, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 23:10:47.598'),
(393, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-27 23:37:04.433'),
(446, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 00:09:52.226'),
(449, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 04:58:45.370'),
(450, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 07:36:42.288'),
(451, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 07:36:42.593'),
(490, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 08:37:23.824'),
(491, 1, NULL, 9, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 08:38:38.039'),
(492, 1, NULL, 10, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 08:39:38.947'),
(493, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 09:16:20.340'),
(494, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 09:43:02.501'),
(495, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 09:49:56.861'),
(594, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 14:24:33.142'),
(633, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 15:29:09.845'),
(634, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 15:37:56.930'),
(635, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 15:38:11.764'),
(636, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 15:38:58.066'),
(637, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 15:47:32.560'),
(638, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 15:49:55.928'),
(639, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-28 15:50:17.952'),
(640, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-29 15:14:36.146'),
(641, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-29 20:47:59.735'),
(642, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-29 21:06:36.652'),
(689, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-29 21:43:33.906'),
(690, 1, NULL, 2, 'users', 'profile.avatar_update', NULL, NULL, NULL, 'Profile media updated', NULL, NULL, NULL, NULL, '2026-08-29 21:44:04.353'),
(691, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-30 06:14:39.834'),
(692, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-30 08:02:26.867'),
(693, 1, NULL, 2, 'users', 'profile.banner_update', NULL, NULL, NULL, 'Profile media updated', NULL, NULL, NULL, NULL, '2026-08-30 08:06:14.360'),
(710, 1, NULL, 2, 'users', 'profile.avatar_update', NULL, NULL, NULL, 'Profile media updated', NULL, NULL, NULL, NULL, '2026-08-30 09:46:53.436'),
(727, 1, NULL, 2, 'auth', 'login', NULL, NULL, NULL, 'User logged in successfully', NULL, NULL, NULL, NULL, '2026-08-30 12:20:54.915'),
(825, 1, 2, 2, 'studio_projects', 'studio.project_external_add', 'studio_project', 58, 'SMK-VND-A5C14637', 'Menambahkan kolaborator eksternal Vendor Smoke A5C14637 pada proyek SMK-VND-A5C14637.', NULL, '{\"party_id\": 84, \"agreed_fee\": 2000000, \"assignment_role\": \"freelancer\"}', NULL, NULL, '2026-08-30 07:03:45.375'),
(827, 1, 2, 2, 'studio_projects', 'studio.project_external_update', 'studio_project', 58, 'SMK-VND-A5C14637', 'Memperbarui penugasan eksternal pada proyek SMK-VND-A5C14637.', '{\"agreed_fee\": 2000000, \"assignment_role\": \"freelancer\"}', '{\"agreed_fee\": 2100000, \"assignment_role\": \"freelancer\"}', NULL, NULL, '2026-08-30 07:03:45.397'),
(829, 1, 2, 2, 'studio_projects', 'studio.project_external_end', 'studio_project', 58, 'SMK-VND-A5C14637', 'Mengakhiri penugasan eksternal pada proyek SMK-VND-A5C14637.', NULL, '{\"id\": 24, \"end_date\": \"2026-08-02\"}', NULL, NULL, '2026-08-30 07:03:45.409'),
(833, 1, 2, 2, 'studio_vendors', 'studio.external_party_adopt', 'party', 85, 'CLI-000085', 'Mengadopsi Party CLI-000085 sebagai pihak eksternal Studio.', NULL, '{\"roles\": [\"studio_partner\"], \"contacts\": 0}', NULL, NULL, '2026-08-30 07:03:45.459'),
(1347, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 01:42:41.336'),
(1348, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 02:13:42.750'),
(1422, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 02:37:53.707'),
(1423, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 02:39:54.990'),
(1424, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 02:40:08.890'),
(1425, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 02:40:21.647'),
(1426, 1, NULL, 3, 'auth', 'login', 'user', 3, 'apriladzania', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 02:40:31.907'),
(1427, 1, NULL, 3, 'auth', 'logout', 'user', 3, 'apriladzania', 'User logged out explicitly', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 02:40:45.946'),
(1428, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 02:40:51.909'),
(1485, 1, 1, 2, 'calendar', 'calendar.event_create', 'calendar_event', 56, 'EVT-000056', 'Membuat acara manual.', NULL, '{\"title\": \"Browser acara 8efdc6c3\", \"end_at\": \"2026-08-31 21:05:00.000\", \"all_day\": false, \"start_at\": \"2026-08-31 21:05:00.000\", \"attendee_ids\": []}', NULL, NULL, '2026-08-31 04:05:55.065'),
(1486, 1, 1, 2, 'tasks', 'tasks.create', 'task', 13, 'TSK-000013', 'Membuat tugas manual.', NULL, '{\"title\": \"Browser tugas 8efdc6c3\", \"assignee_ids\": [], \"priority_code\": \"normal\"}', NULL, NULL, '2026-08-31 04:05:55.550'),
(1500, 1, 1, 2, 'calendar', 'calendar.event_create', 'calendar_event', 64, 'EVT-000064', 'Membuat acara manual.', NULL, '{\"title\": \"Browser acara 68df6032\", \"end_at\": \"2026-08-31 21:13:00.000\", \"all_day\": false, \"start_at\": \"2026-08-31 21:13:00.000\", \"attendee_ids\": []}', NULL, NULL, '2026-08-31 04:13:37.030'),
(1501, 1, 1, 2, 'calendar', 'calendar.event_create', 'calendar_event', 66, 'EVT-000066', 'Membuat acara manual.', NULL, '{\"title\": \"Browser acara e42b104a\", \"end_at\": \"2026-08-31 21:14:00.000\", \"all_day\": false, \"start_at\": \"2026-08-31 21:14:00.000\", \"attendee_ids\": []}', NULL, NULL, '2026-08-31 04:14:54.657'),
(1502, 1, 1, 2, 'tasks', 'tasks.create', 'task', 16, 'TSK-000016', 'Membuat tugas manual.', NULL, '{\"title\": \"Browser tugas e42b104a\", \"assignee_ids\": [], \"priority_code\": \"normal\"}', NULL, NULL, '2026-08-31 04:14:55.522'),
(1503, 1, 1, 2, 'calendar', 'calendar.event_create', 'calendar_event', 68, 'EVT-000068', 'Membuat acara manual.', NULL, '{\"title\": \"Browser acara 15a3b4bb\", \"end_at\": \"2026-08-31 21:15:00.000\", \"all_day\": false, \"start_at\": \"2026-08-31 21:15:00.000\", \"attendee_ids\": []}', NULL, NULL, '2026-08-31 04:15:38.084'),
(1504, 1, 1, 2, 'tasks', 'tasks.create', 'task', 17, 'TSK-000017', 'Membuat tugas manual.', NULL, '{\"title\": \"Browser tugas 15a3b4bb\", \"assignee_ids\": [], \"priority_code\": \"normal\"}', NULL, NULL, '2026-08-31 04:15:39.409'),
(1505, 1, 1, 2, 'tasks', 'tasks.status_change', 'task', 16, 'TSK-000016', 'Mengubah status tugas.', '{\"status_code\": \"todo\", \"completed_at\": null}', '{\"status_code\": \"in_progress\", \"completed_at\": null}', NULL, NULL, '2026-08-31 04:15:39.731'),
(1519, 1, 1, 2, 'calendar', 'calendar.event_create', 'calendar_event', 76, 'EVT-000076', 'Membuat acara manual.', NULL, '{\"title\": \"Browser acara b1ae4693\", \"end_at\": \"2026-08-31 21:22:00.000\", \"all_day\": false, \"start_at\": \"2026-08-31 21:22:00.000\", \"attendee_ids\": []}', NULL, NULL, '2026-08-31 04:22:03.985'),
(1520, 1, 1, 2, 'tasks', 'tasks.create', 'task', 20, 'TSK-000020', 'Membuat tugas manual.', NULL, '{\"title\": \"Browser tugas b1ae4693\", \"assignee_ids\": [], \"priority_code\": \"normal\"}', NULL, NULL, '2026-08-31 04:22:05.122'),
(1521, 1, 1, 2, 'tasks', 'tasks.status_change', 'task', 16, 'TSK-000016', 'Mengubah status tugas.', '{\"status_code\": \"in_progress\", \"completed_at\": null}', '{\"status_code\": \"in_progress\", \"completed_at\": null}', NULL, NULL, '2026-08-31 04:22:05.616'),
(1522, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 04:26:13.682'),
(1523, 1, NULL, 2, 'auth', 'logout', 'user', 2, 'taqizdihar', 'User logged out explicitly', NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 05:24:41.151'),
(1747, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 97, 'TRS-000097', 'Saldo awal Bank Finance 1F82D32B', NULL, NULL, NULL, NULL, '2026-08-31 06:06:35.145'),
(1748, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 97, 'TRS-000097', 'Membuat akun kas Studio TRS-000097.', NULL, '{\"name\": \"Bank Finance 1F82D32B\", \"opening_balance\": 10000000}', NULL, NULL, '2026-08-31 06:06:35.148'),
(1749, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 98, 'TRS-000098', 'Saldo awal Kas Finance 1F82D32B', NULL, NULL, NULL, NULL, '2026-08-31 06:06:35.165'),
(1750, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 98, 'TRS-000098', 'Membuat akun kas Studio TRS-000098.', NULL, '{\"name\": \"Kas Finance 1F82D32B\", \"opening_balance\": 1000000}', NULL, NULL, '2026-08-31 06:06:35.168'),
(1751, 1, 2, 2, 'studio_finance', 'studio.finance.transfer', 'internal_transfer', 28, 'TRF-000028', 'Transfer TRF-000028 antar kas Studio.', NULL, '{\"to\": 98, \"from\": 97, \"amount\": 1000000}', NULL, NULL, '2026-08-31 06:06:35.199'),
(1752, 1, 2, 2, 'studio_finance', 'studio.finance.customer_payment', 'payment', 29, 'PAY-000029', 'Mencatat pembayaran pelanggan PAY-000029.', NULL, NULL, NULL, NULL, '2026-08-31 06:06:35.278'),
(1753, 1, 2, 2, 'studio_finance', 'studio.finance.expense_create', 'expense', 41, 'EXP-000041', 'Membuat pengeluaran EXP-000041.', NULL, '{\"amount\": 300000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-08-31 06:06:35.319'),
(1754, 1, 2, 2, 'studio_finance', 'studio.finance.expense_approve', 'expense', 41, 'EXP-000041', 'Menyetujui pengeluaran EXP-000041.', NULL, NULL, NULL, NULL, '2026-08-31 06:06:35.329'),
(1755, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 41, 'EXP-000041', 'Transport Proyek Smoke', NULL, NULL, NULL, NULL, '2026-08-31 06:06:35.352'),
(1756, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 41, 'EXP-000041', 'Membayar pengeluaran EXP-000041.', NULL, '{\"total\": 300000, \"transaction_id\": 162}', NULL, NULL, '2026-08-31 06:06:35.359'),
(1757, 1, 2, 2, 'studio_finance', 'studio.finance.expense_reversal', 'expense', 41, 'EXP-000041', 'Pembalikan EXP-000041: Pembalikan fixture smoke.', NULL, NULL, NULL, NULL, '2026-08-31 06:06:35.397'),
(1758, 1, 2, 2, 'studio_finance', 'studio.finance.expense_void', 'expense', 41, 'EXP-000041', 'Membalik pengeluaran EXP-000041.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Pembalikan fixture smoke.\", \"status_code\": \"void\", \"reversal_transaction_id\": 163}', NULL, NULL, '2026-08-31 06:06:35.403'),
(1759, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 42, 'EXP-000042', 'Payout Editor FIN-SMK-1F82D32B', NULL, NULL, NULL, NULL, '2026-08-31 06:06:35.435'),
(1760, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 42, 'EXP-000042', 'Membayar pengeluaran EXP-000042.', NULL, '{\"total\": 1000000, \"transaction_id\": 164}', NULL, NULL, '2026-08-31 06:06:35.440'),
(1761, 1, 2, 2, 'studio_finance', 'studio.finance.external_assignment_sync', 'project_external_assignment', 32, 'ASSIGN-32', 'Menyelaraskan status pembayaran penugasan eksternal.', NULL, '{\"paid\": 1000000, \"status\": \"partial\", \"remaining\": 1000000}', NULL, NULL, '2026-08-31 06:06:35.444'),
(1762, 1, 2, 2, 'studio_finance', 'studio.finance.budget_create', 'budget', 13, 'BDG-000013', 'Membuat anggaran BDG-000013.', NULL, '{\"total\": 5000000, \"item_count\": 1}', NULL, NULL, '2026-08-31 06:06:35.462'),
(1763, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 103, 'TRS-000103', 'Saldo awal Bank Finance C3353E15', NULL, NULL, NULL, NULL, '2026-08-31 06:07:30.226'),
(1764, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 103, 'TRS-000103', 'Membuat akun kas Studio TRS-000103.', NULL, '{\"name\": \"Bank Finance C3353E15\", \"opening_balance\": 10000000}', NULL, NULL, '2026-08-31 06:07:30.228'),
(1765, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 104, 'TRS-000104', 'Saldo awal Kas Finance C3353E15', NULL, NULL, NULL, NULL, '2026-08-31 06:07:30.246'),
(1766, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 104, 'TRS-000104', 'Membuat akun kas Studio TRS-000104.', NULL, '{\"name\": \"Kas Finance C3353E15\", \"opening_balance\": 1000000}', NULL, NULL, '2026-08-31 06:07:30.247'),
(1767, 1, 2, 2, 'studio_finance', 'studio.finance.transfer', 'internal_transfer', 29, 'TRF-000029', 'Transfer TRF-000029 antar kas Studio.', NULL, '{\"to\": 104, \"from\": 103, \"amount\": 1000000}', NULL, NULL, '2026-08-31 06:07:30.276'),
(1768, 1, 2, 2, 'studio_finance', 'studio.finance.customer_payment', 'payment', 30, 'PAY-000030', 'Mencatat pembayaran pelanggan PAY-000030.', NULL, NULL, NULL, NULL, '2026-08-31 06:07:30.385'),
(1769, 1, 2, 2, 'studio_finance', 'studio.finance.expense_create', 'expense', 43, 'EXP-000043', 'Membuat pengeluaran EXP-000043.', NULL, '{\"amount\": 300000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-08-31 06:07:30.425'),
(1770, 1, 2, 2, 'studio_finance', 'studio.finance.expense_approve', 'expense', 43, 'EXP-000043', 'Menyetujui pengeluaran EXP-000043.', NULL, NULL, NULL, NULL, '2026-08-31 06:07:30.438'),
(1771, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 43, 'EXP-000043', 'Transport Proyek Smoke', NULL, NULL, NULL, NULL, '2026-08-31 06:07:30.457'),
(1772, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 43, 'EXP-000043', 'Membayar pengeluaran EXP-000043.', NULL, '{\"total\": 300000, \"transaction_id\": 168}', NULL, NULL, '2026-08-31 06:07:30.463'),
(1773, 1, 2, 2, 'studio_finance', 'studio.finance.expense_reversal', 'expense', 43, 'EXP-000043', 'Pembalikan EXP-000043: Pembalikan fixture smoke.', NULL, NULL, NULL, NULL, '2026-08-31 06:07:30.487'),
(1774, 1, 2, 2, 'studio_finance', 'studio.finance.expense_void', 'expense', 43, 'EXP-000043', 'Membalik pengeluaran EXP-000043.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Pembalikan fixture smoke.\", \"status_code\": \"void\", \"reversal_transaction_id\": 169}', NULL, NULL, '2026-08-31 06:07:30.493'),
(1775, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 44, 'EXP-000044', 'Payout Editor FIN-SMK-C3353E15', NULL, NULL, NULL, NULL, '2026-08-31 06:07:30.525'),
(1776, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 44, 'EXP-000044', 'Membayar pengeluaran EXP-000044.', NULL, '{\"total\": 1000000, \"transaction_id\": 170}', NULL, NULL, '2026-08-31 06:07:30.529'),
(1777, 1, 2, 2, 'studio_finance', 'studio.finance.external_assignment_sync', 'project_external_assignment', 33, 'ASSIGN-33', 'Menyelaraskan status pembayaran penugasan eksternal.', NULL, '{\"paid\": 1000000, \"status\": \"partial\", \"remaining\": 1000000}', NULL, NULL, '2026-08-31 06:07:30.531'),
(1778, 1, 2, 2, 'studio_finance', 'studio.finance.budget_create', 'budget', 14, 'BDG-000014', 'Membuat anggaran BDG-000014.', NULL, '{\"total\": 5000000, \"item_count\": 1}', NULL, NULL, '2026-08-31 06:07:30.546'),
(1808, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 122, 'TRS-000122', 'Saldo awal Bank Finance 45CC872F', NULL, NULL, NULL, NULL, '2026-08-31 06:18:35.205'),
(1809, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 122, 'TRS-000122', 'Membuat akun kas Studio TRS-000122.', NULL, '{\"name\": \"Bank Finance 45CC872F\", \"opening_balance\": 10000000}', NULL, NULL, '2026-08-31 06:18:35.207'),
(1810, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 123, 'TRS-000123', 'Saldo awal Kas Finance 45CC872F', NULL, NULL, NULL, NULL, '2026-08-31 06:18:35.229'),
(1811, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 123, 'TRS-000123', 'Membuat akun kas Studio TRS-000123.', NULL, '{\"name\": \"Kas Finance 45CC872F\", \"opening_balance\": 1000000}', NULL, NULL, '2026-08-31 06:18:35.230'),
(1812, 1, 2, 2, 'studio_finance', 'studio.finance.transfer', 'internal_transfer', 33, 'TRF-000033', 'Transfer TRF-000033 antar kas Studio.', NULL, '{\"to\": 123, \"from\": 122, \"amount\": 1000000}', NULL, NULL, '2026-08-31 06:18:35.258'),
(1813, 1, 2, 2, 'studio_finance', 'studio.finance.customer_payment', 'payment', 35, 'PAY-000035', 'Mencatat pembayaran pelanggan PAY-000035.', NULL, NULL, NULL, NULL, '2026-08-31 06:18:35.324'),
(1814, 1, 2, 2, 'studio_finance', 'studio.finance.expense_create', 'expense', 45, 'EXP-000045', 'Membuat pengeluaran EXP-000045.', NULL, '{\"amount\": 300000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-08-31 06:18:35.359'),
(1815, 1, 2, 2, 'studio_finance', 'studio.finance.expense_approve', 'expense', 45, 'EXP-000045', 'Menyetujui pengeluaran EXP-000045.', NULL, NULL, NULL, NULL, '2026-08-31 06:18:35.370'),
(1816, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 45, 'EXP-000045', 'Transport Proyek Smoke', NULL, NULL, NULL, NULL, '2026-08-31 06:18:35.390'),
(1817, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 45, 'EXP-000045', 'Membayar pengeluaran EXP-000045.', NULL, '{\"total\": 300000, \"transaction_id\": 192}', NULL, NULL, '2026-08-31 06:18:35.397'),
(1818, 1, 2, 2, 'studio_finance', 'studio.finance.expense_reversal', 'expense', 45, 'EXP-000045', 'Pembalikan EXP-000045: Pembalikan fixture smoke.', NULL, NULL, NULL, NULL, '2026-08-31 06:18:35.424'),
(1819, 1, 2, 2, 'studio_finance', 'studio.finance.expense_void', 'expense', 45, 'EXP-000045', 'Membalik pengeluaran EXP-000045.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Pembalikan fixture smoke.\", \"status_code\": \"void\", \"reversal_transaction_id\": 193}', NULL, NULL, '2026-08-31 06:18:35.429'),
(1820, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 46, 'EXP-000046', 'Payout Editor FIN-SMK-45CC872F', NULL, NULL, NULL, NULL, '2026-08-31 06:18:35.459'),
(1821, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 46, 'EXP-000046', 'Membayar pengeluaran EXP-000046.', NULL, '{\"total\": 1000000, \"transaction_id\": 194}', NULL, NULL, '2026-08-31 06:18:35.463'),
(1822, 1, 2, 2, 'studio_finance', 'studio.finance.external_assignment_sync', 'project_external_assignment', 34, 'ASSIGN-34', 'Menyelaraskan status pembayaran penugasan eksternal.', NULL, '{\"paid\": 1000000, \"status\": \"partial\", \"remaining\": 1000000}', NULL, NULL, '2026-08-31 06:18:35.536'),
(1823, 1, 2, 2, 'studio_finance', 'studio.finance.budget_create', 'budget', 15, 'BDG-000015', 'Membuat anggaran BDG-000015.', NULL, '{\"total\": 5000000, \"item_count\": 1}', NULL, NULL, '2026-08-31 06:18:35.556'),
(2031, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"csv\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_28332B3269\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 08:39:19.145'),
(2032, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"xlsx\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_28332B3269\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 08:39:19.201'),
(2063, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"csv\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_388A97B911\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 08:39:45.292'),
(2064, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"xlsx\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_388A97B911\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 08:39:45.342'),
(2095, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"csv\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_260224159C\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 08:39:54.650'),
(2096, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"xlsx\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_260224159C\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 08:39:54.701'),
(2114, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 130, 'TRS-000130', 'Saldo awal Bank Finance C357D318', NULL, NULL, NULL, NULL, '2026-08-31 08:46:53.459'),
(2115, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 130, 'TRS-000130', 'Membuat akun kas Studio TRS-000130.', NULL, '{\"name\": \"Bank Finance C357D318\", \"opening_balance\": 10000000}', NULL, NULL, '2026-08-31 08:46:53.461'),
(2116, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 131, 'TRS-000131', 'Saldo awal Kas Finance C357D318', NULL, NULL, NULL, NULL, '2026-08-31 08:46:53.511'),
(2117, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 131, 'TRS-000131', 'Membuat akun kas Studio TRS-000131.', NULL, '{\"name\": \"Kas Finance C357D318\", \"opening_balance\": 1000000}', NULL, NULL, '2026-08-31 08:46:53.512'),
(2118, 1, 2, 2, 'studio_finance', 'studio.finance.transfer', 'internal_transfer', 35, 'TRF-000035', 'Transfer TRF-000035 antar kas Studio.', NULL, '{\"to\": 131, \"from\": 130, \"amount\": 1000000}', NULL, NULL, '2026-08-31 08:46:53.573'),
(2119, 1, 2, 2, 'studio_finance', 'studio.finance.customer_payment', 'payment', 37, 'PAY-000037', 'Mencatat pembayaran pelanggan PAY-000037.', NULL, NULL, NULL, NULL, '2026-08-31 08:46:53.671'),
(2120, 1, 2, 2, 'studio_finance', 'studio.finance.expense_create', 'expense', 48, 'EXP-000048', 'Membuat pengeluaran EXP-000048.', NULL, '{\"amount\": 300000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-08-31 08:46:53.738'),
(2121, 1, 2, 2, 'studio_finance', 'studio.finance.expense_approve', 'expense', 48, 'EXP-000048', 'Menyetujui pengeluaran EXP-000048.', NULL, NULL, NULL, NULL, '2026-08-31 08:46:53.787'),
(2122, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 48, 'EXP-000048', 'Transport Proyek Smoke', NULL, NULL, NULL, NULL, '2026-08-31 08:46:53.843'),
(2123, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 48, 'EXP-000048', 'Membayar pengeluaran EXP-000048.', NULL, '{\"total\": 300000, \"transaction_id\": 200}', NULL, NULL, '2026-08-31 08:46:53.848'),
(2124, 1, 2, 2, 'studio_finance', 'studio.finance.expense_reversal', 'expense', 48, 'EXP-000048', 'Pembalikan EXP-000048: Pembalikan fixture smoke.', NULL, NULL, NULL, NULL, '2026-08-31 08:46:54.164'),
(2125, 1, 2, 2, 'studio_finance', 'studio.finance.expense_void', 'expense', 48, 'EXP-000048', 'Membalik pengeluaran EXP-000048.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Pembalikan fixture smoke.\", \"status_code\": \"void\", \"reversal_transaction_id\": 201}', NULL, NULL, '2026-08-31 08:46:54.168'),
(2126, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 49, 'EXP-000049', 'Payout Editor FIN-SMK-C357D318', NULL, NULL, NULL, NULL, '2026-08-31 08:46:54.250'),
(2127, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 49, 'EXP-000049', 'Membayar pengeluaran EXP-000049.', NULL, '{\"total\": 1000000, \"transaction_id\": 202}', NULL, NULL, '2026-08-31 08:46:54.389'),
(2128, 1, 2, 2, 'studio_finance', 'studio.finance.external_assignment_sync', 'project_external_assignment', 36, 'ASSIGN-36', 'Menyelaraskan status pembayaran penugasan eksternal.', NULL, '{\"paid\": 1000000, \"status\": \"partial\", \"remaining\": 1000000}', NULL, NULL, '2026-08-31 08:46:54.391'),
(2129, 1, 2, 2, 'studio_finance', 'studio.finance.budget_create', 'budget', 16, 'BDG-000016', 'Membuat anggaran BDG-000016.', NULL, '{\"total\": 5000000, \"item_count\": 1}', NULL, NULL, '2026-08-31 08:46:54.405'),
(2219, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"csv\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_AAC5B0CE9D\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 08:52:17.312'),
(2220, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"xlsx\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_AAC5B0CE9D\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 08:52:17.366'),
(2227, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 09:01:21.415'),
(2228, 1, NULL, 2, 'auth', 'login', 'user', 2, 'taqizdihar', 'User logged in successfully', NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-08-31 12:24:19.516'),
(2287, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"csv\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_861D882CC6\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 13:16:46.278'),
(2288, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"xlsx\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_861D882CC6\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 13:16:46.359'),
(2292, 1, NULL, 2, 'settings', 'settings.group.update', 'system_setting_group', NULL, 'organization:general', 'Memperbarui grup pengaturan general.', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"monday\"}]}', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"sunday\"}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36', '2026-08-31 15:44:23.250'),
(2293, 1, NULL, 2, 'settings', 'settings.reset', 'system_setting', NULL, 'organization:general:week_start', 'Mereset Hari awal minggu ke default.', '{\"value\": \"sunday\"}', '{\"value\": \"monday\", \"source\": \"default\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36', '2026-08-31 15:44:23.573'),
(2389, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"csv\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_64A9830FF8\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 15:47:44.269'),
(2390, 1, NULL, 2, 'master_data', 'master_data.export', 'master_data_dataset', NULL, 'units', 'Mengekspor Data Master Satuan.', NULL, '{\"format\": \"xlsx\", \"dataset\": \"units\", \"filters\": {\"q\": \"SMK_DM_U_64A9830FF8\", \"status\": \"active\", \"parent_id\": null, \"unit_group\": null, \"channel_type\": null, \"business_unit\": null, \"transaction_type\": null}}', NULL, 'smoke-master-data', '2026-08-31 15:47:44.322'),
(2405, 1, NULL, 2, 'settings', 'settings.group.update', 'system_setting_group', NULL, 'organization:general', 'Memperbarui grup pengaturan general.', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"monday\"}]}', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"sunday\"}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36', '2026-08-31 15:50:01.886'),
(2406, 1, NULL, 2, 'settings', 'settings.reset', 'system_setting', NULL, 'organization:general:week_start', 'Mereset Hari awal minggu ke default.', '{\"value\": \"sunday\"}', '{\"value\": \"monday\", \"source\": \"default\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36', '2026-08-31 15:50:02.202'),
(2410, 1, NULL, 2, 'settings', 'settings.organization.logo.upload', 'organization', 1, 'UNI-INSIDE', 'Mengganti logo organisasi.', '{\"logo_configured\": false}', '{\"logo_configured\": true}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36', '2026-08-31 15:54:52.938'),
(2411, 1, NULL, 2, 'settings', 'settings.group.update', 'system_setting_group', NULL, 'organization:general', 'Memperbarui grup pengaturan general.', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"monday\"}]}', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"sunday\"}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36', '2026-08-31 15:55:31.759'),
(2412, 1, NULL, 2, 'settings', 'settings.reset', 'system_setting', NULL, 'organization:general:week_start', 'Mereset Hari awal minggu ke default.', '{\"value\": \"sunday\"}', '{\"value\": \"monday\", \"source\": \"default\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36', '2026-08-31 15:55:31.882'),
(2429, 1, NULL, 2, 'settings', 'settings.group.update', 'system_setting_group', NULL, 'organization:general', 'Memperbarui grup pengaturan general.', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"monday\"}]}', '{\"group\": \"general\", \"scope\": \"organization\", \"settings\": [{\"key\": \"week_start\", \"value\": \"sunday\"}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36', '2026-09-01 01:01:48.061'),
(2430, 1, NULL, 2, 'settings', 'settings.reset', 'system_setting', NULL, 'organization:general:week_start', 'Mereset Hari awal minggu ke default.', '{\"value\": \"sunday\"}', '{\"value\": \"monday\", \"source\": \"default\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36', '2026-09-01 01:01:48.361'),
(2444, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 144, 'TRS-000144', 'Saldo awal Bank Finance 3579F0CD', NULL, NULL, NULL, NULL, '2026-09-01 01:02:09.371'),
(2445, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 144, 'TRS-000144', 'Membuat akun kas Studio TRS-000144.', NULL, '{\"name\": \"Bank Finance 3579F0CD\", \"opening_balance\": 10000000}', NULL, NULL, '2026-09-01 01:02:09.372'),
(2446, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_opening', 'treasury_account', 145, 'TRS-000145', 'Saldo awal Kas Finance 3579F0CD', NULL, NULL, NULL, NULL, '2026-09-01 01:02:09.382'),
(2447, 1, 2, 2, 'studio_finance', 'studio.finance.treasury_create', 'treasury_account', 145, 'TRS-000145', 'Membuat akun kas Studio TRS-000145.', NULL, '{\"name\": \"Kas Finance 3579F0CD\", \"opening_balance\": 1000000}', NULL, NULL, '2026-09-01 01:02:09.383'),
(2448, 1, 2, 2, 'studio_finance', 'studio.finance.transfer', 'internal_transfer', 39, 'TRF-000039', 'Transfer TRF-000039 antar kas Studio.', NULL, '{\"to\": 145, \"from\": 144, \"amount\": 1000000}', NULL, NULL, '2026-09-01 01:02:09.403'),
(2449, 1, 2, 2, 'studio_finance', 'studio.finance.customer_payment', 'payment', 45, 'PAY-000045', 'Mencatat pembayaran pelanggan PAY-000045.', NULL, NULL, NULL, NULL, '2026-09-01 01:02:09.465'),
(2450, 1, 2, 2, 'studio_finance', 'studio.finance.expense_create', 'expense', 52, 'EXP-000052', 'Membuat pengeluaran EXP-000052.', NULL, '{\"amount\": 300000, \"status\": \"draft\", \"tax_amount\": 0}', NULL, NULL, '2026-09-01 01:02:09.494'),
(2451, 1, 2, 2, 'studio_finance', 'studio.finance.expense_approve', 'expense', 52, 'EXP-000052', 'Menyetujui pengeluaran EXP-000052.', NULL, NULL, NULL, NULL, '2026-09-01 01:02:09.503'),
(2452, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 52, 'EXP-000052', 'Transport Proyek Smoke', NULL, NULL, NULL, NULL, '2026-09-01 01:02:09.519'),
(2453, 1, 2, 2, 'studio_finance', 'studio.finance.expense_pay', 'expense', 52, 'EXP-000052', 'Membayar pengeluaran EXP-000052.', NULL, '{\"total\": 300000, \"transaction_id\": 237}', NULL, NULL, '2026-09-01 01:02:09.524'),
(2454, 1, 2, 2, 'studio_finance', 'studio.finance.expense_reversal', 'expense', 52, 'EXP-000052', 'Pembalikan EXP-000052: Pembalikan fixture smoke.', NULL, NULL, NULL, NULL, '2026-09-01 01:02:09.547'),
(2455, 1, 2, 2, 'studio_finance', 'studio.finance.expense_void', 'expense', 52, 'EXP-000052', 'Membalik pengeluaran EXP-000052.', '{\"status_code\": \"paid\"}', '{\"reason\": \"Pembalikan fixture smoke.\", \"status_code\": \"void\", \"reversal_transaction_id\": 238}', NULL, NULL, '2026-09-01 01:02:09.552'),
(2456, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 53, 'EXP-000053', 'Payout Editor FIN-SMK-3579F0CD', NULL, NULL, NULL, NULL, '2026-09-01 01:02:09.572'),
(2457, 1, 2, 2, 'studio_finance', 'studio.finance.external_payout', 'expense', 53, 'EXP-000053', 'Membayar pengeluaran EXP-000053.', NULL, '{\"total\": 1000000, \"transaction_id\": 239}', NULL, NULL, '2026-09-01 01:02:09.576'),
(2458, 1, 2, 2, 'studio_finance', 'studio.finance.external_assignment_sync', 'project_external_assignment', 39, 'ASSIGN-39', 'Menyelaraskan status pembayaran penugasan eksternal.', NULL, '{\"paid\": 1000000, \"status\": \"partial\", \"remaining\": 1000000}', NULL, NULL, '2026-09-01 01:02:09.578'),
(2459, 1, 2, 2, 'studio_finance', 'studio.finance.budget_create', 'budget', 17, 'BDG-000017', 'Membuat anggaran BDG-000017.', NULL, '{\"total\": 5000000, \"item_count\": 1}', NULL, NULL, '2026-09-01 01:02:09.593'),
(2474, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 30, 'AUT-000030', 'Membuat aturan otomasi AUT-000030.', '{\"name\": \"Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"info\", \"title_template\": \"Smoke {{order.order_code}}\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Dry run pusat otomasi.\"}}], \"version\": 1}, \"description\": \"Fixture sementara smoke global.\", \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 02:43:06.641'),
(2475, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 31, 'AUT-000031', 'Membuat aturan otomasi AUT-000031.', '{\"name\": \"Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"info\", \"title_template\": \"Smoke {{order.order_code}}\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Dry run pusat otomasi.\"}}], \"version\": 1}, \"description\": \"Fixture sementara smoke global.\", \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 02:44:59.368');
INSERT INTO `audit_logs` (`id`, `organization_id`, `business_unit_id`, `user_id`, `module_code`, `action_code`, `entity_type`, `entity_id`, `entity_code`, `description`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`) VALUES
(2476, 1, 1, 2, 'craft_automations', 'automation.rule_update', 'automation_rule', 31, 'AUT-000031', 'Memperbarui aturan otomasi AUT-000031.', '{\"version_no\": 1}', '{\"name\": \"Smoke Pusat Otomasi\", \"priority\": 100, \"version_no\": 2, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"info\", \"title_template\": \"Smoke {{order.order_code}}\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Dry run pusat otomasi.\"}}], \"version\": 1}, \"description\": \"Fixture diperbarui.\", \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, '2026-09-01 02:44:59.401'),
(2477, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 34, 'AUT-000034', 'Membuat aturan otomasi AUT-000034.', '{\"name\": \"Browser Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"warning\", \"title_template\": \"Notifikasi otomasi\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Aturan otomasi membutuhkan perhatian.\"}, \"continue_on_error\": false}], \"version\": 1}, \"description\": null, \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 02:53:54.753'),
(2478, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 35, 'AUT-000035', 'Membuat aturan otomasi AUT-000035.', '{\"name\": \"Browser Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"warning\", \"title_template\": \"Notifikasi otomasi\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Aturan otomasi membutuhkan perhatian.\"}, \"continue_on_error\": false}], \"version\": 1}, \"description\": null, \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 02:54:39.012'),
(2479, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 36, 'AUT-000036', 'Membuat aturan otomasi AUT-000036.', '{\"name\": \"Browser Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"warning\", \"title_template\": \"Notifikasi otomasi\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Aturan otomasi membutuhkan perhatian.\"}, \"continue_on_error\": false}], \"version\": 1}, \"description\": null, \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 02:56:41.949'),
(2480, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 37, 'AUT-000037', 'Membuat aturan otomasi AUT-000037.', '{\"name\": \"Browser Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"warning\", \"title_template\": \"Notifikasi otomasi\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Aturan otomasi membutuhkan perhatian.\"}, \"continue_on_error\": false}], \"version\": 1}, \"description\": null, \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 02:57:46.926'),
(2481, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 38, 'AUT-000038', 'Membuat aturan otomasi AUT-000038.', '{\"name\": \"Browser Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"warning\", \"title_template\": \"Notifikasi otomasi\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Aturan otomasi membutuhkan perhatian.\"}, \"continue_on_error\": false}], \"version\": 1}, \"description\": null, \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 02:58:32.457'),
(2482, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 39, 'AUT-000039', 'Membuat aturan otomasi AUT-000039.', '{\"name\": \"Browser Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"warning\", \"title_template\": \"Notifikasi otomasi\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Aturan otomasi membutuhkan perhatian.\"}, \"continue_on_error\": false}], \"version\": 1}, \"description\": null, \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 02:59:08.291'),
(2483, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 42, 'AUT-000042', 'Membuat aturan otomasi AUT-000042.', '{\"name\": \"Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"info\", \"title_template\": \"Smoke {{order.order_code}}\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Dry run pusat otomasi.\"}}], \"version\": 1}, \"description\": \"Fixture sementara smoke global.\", \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 03:03:20.850'),
(2484, 1, 1, 2, 'craft_automations', 'automation.rule_update', 'automation_rule', 42, 'AUT-000042', 'Memperbarui aturan otomasi AUT-000042.', '{\"version_no\": 1}', '{\"name\": \"Smoke Pusat Otomasi\", \"priority\": 100, \"version_no\": 2, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"info\", \"title_template\": \"Smoke {{order.order_code}}\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Dry run pusat otomasi.\"}}], \"version\": 1}, \"description\": \"Fixture diperbarui.\", \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, '2026-09-01 03:03:20.898'),
(2485, 1, 1, 2, 'craft_automations', 'automation.rule_create', 'automation_rule', 43, 'AUT-000043', 'Membuat aturan otomasi AUT-000043.', '{\"name\": \"Browser Smoke Pusat Otomasi\", \"priority\": 100, \"action_json\": {\"actions\": [{\"type\": \"notification.create\", \"config\": {\"severity\": \"warning\", \"title_template\": \"Notifikasi otomasi\", \"recipient_scope\": \"workspace_broadcast\", \"message_template\": \"Aturan otomasi membutuhkan perhatian.\"}, \"continue_on_error\": false}], \"version\": 1}, \"description\": null, \"max_retries\": 0, \"status_code\": \"draft\", \"trigger_type\": \"event\", \"trigger_event\": \"order.created\", \"condition_json\": null, \"cooldown_seconds\": 0, \"schedule_timezone\": null, \"trigger_config_json\": null}', NULL, NULL, NULL, '2026-09-01 03:09:38.816');

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

--
-- Dumping data for table `calendar_events`
--

INSERT INTO `calendar_events` (`id`, `organization_id`, `business_unit_id`, `event_code`, `title`, `description`, `location_name`, `event_type`, `source_module_code`, `start_at`, `end_at`, `all_day`, `status_code`, `reminder_minutes_before`, `source_type`, `source_id`, `source_code`, `source_key`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(40, 1, 1, 'SRC-C8C370DC', 'Source c8c370dc', NULL, NULL, 'order_deadline', 'craft_orders', '2026-08-31 03:54:13.342', NULL, 0, 'scheduled', NULL, 'craft_order', 900051395, 'BROWSER', 'browser-source:c8c370dc', 2, NULL, '2026-08-31 10:54:13.342', '2026-08-31 10:54:56.963', '2026-08-31 03:54:56.963'),
(41, 1, 1, 'SRC-5BCBDDB1', 'Source 5bcbddb1', NULL, NULL, 'order_deadline', 'craft_orders', '2026-08-31 03:54:27.747', NULL, 0, 'scheduled', NULL, 'craft_order', 900023499, 'BROWSER', 'browser-source:5bcbddb1', 2, NULL, '2026-08-31 10:54:27.747', '2026-08-31 10:54:56.968', '2026-08-31 03:54:56.968'),
(64, 1, 1, 'EVT-000064', 'Browser acara 68df6032', NULL, NULL, 'meeting', 'calendar', '2026-08-31 21:13:00.000', '2026-08-31 21:13:00.000', 0, 'scheduled', NULL, 'manual_event', NULL, NULL, NULL, 2, 2, '2026-08-31 11:13:36.957', '2026-08-31 11:13:36.971', NULL),
(66, 1, 1, 'EVT-000066', 'Browser acara e42b104a', NULL, NULL, 'meeting', 'calendar', '2026-08-31 21:14:00.000', '2026-08-31 21:14:00.000', 0, 'scheduled', NULL, 'manual_event', NULL, NULL, NULL, 2, 2, '2026-08-31 11:14:54.593', '2026-08-31 11:14:54.650', NULL);

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

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `organization_id`, `business_unit_id`, `document_code`, `document_type`, `source_module_code`, `title`, `description`, `file_name`, `storage_path`, `mime_type`, `file_size_bytes`, `checksum_sha256`, `entity_type`, `entity_id`, `entity_code`, `version_no`, `is_template`, `archived_at`, `archived_by`, `uploaded_by`, `created_at`, `updated_at`) VALUES
(53, 1, 2, 'SRC-studio_analytics-report_export-5', 'report', 'studio_analytics', 'Ringkasan Analitik', 'Ekspor overview (CSV)', 'UNI-NEXUS_Studio_Ringkasan_Analitik_2026-08-01_2026-08-31.csv', 'reports/1539d2c4-d3cf-4705-b871-d38b523800b8.csv', 'text/csv; charset=utf-8', 4806, '0dc9b2119147c7dfa436962d575d737971bd371fb59f9e5bf0c1d618f0851791', 'report_export', 5, 'overview:csv', 1, 0, NULL, NULL, 1, '2026-08-31 09:23:52.499', '2026-08-31 09:23:52.499'),
(69, 1, 2, 'SRC-studio_analytics-report_export-6', 'report', 'studio_analytics', 'Ringkasan Analitik', 'Ekspor overview (CSV)', 'UNI-NEXUS_Studio_Ringkasan_Analitik_2026-08-01_2026-08-31.csv', 'reports/079b6b78-56f9-474f-a217-ea24eb60fce6.csv', 'text/csv; charset=utf-8', 4806, '9e3b380545296a1ef5de5b98e9f031a3f9d4776bda6426923c604507724aa6fa', 'report_export', 6, 'overview:csv', 1, 0, NULL, NULL, 1, '2026-08-31 12:51:14.784', '2026-08-31 12:51:14.784'),
(75, 1, 2, 'SRC-studio_analytics-report_export-7', 'report', 'studio_analytics', 'Ringkasan Analitik', 'Ekspor overview (CSV)', 'UNI-NEXUS_Studio_Ringkasan_Analitik_2026-08-01_2026-08-31.csv', 'reports/0d96cf8d-cb2c-4e2b-9667-3ad8438c45f1.csv', 'text/csv; charset=utf-8', 4806, '340bbfdf47817f36d6cdc6dc734f3b9bfd39cb23ec6f2e8aa5556ef918b08787', 'report_export', 7, 'overview:csv', 1, 0, NULL, NULL, 1, '2026-08-31 13:19:16.531', '2026-08-31 13:19:16.531'),
(77, 1, 2, 'SRC-studio_analytics-report_export-9', 'report', 'studio_analytics', 'Ringkasan Analitik', 'Ekspor overview (CSV)', 'UNI-NEXUS_Studio_Ringkasan_Analitik_2026-08-01_2026-08-31.csv', 'reports/0095f388-bb2e-42d2-bcb5-ea42b0385fe2.csv', 'text/csv; charset=utf-8', 4806, 'f816716487e91d5df59bd148620cd792172f6ef234d283ed9797f5a197d450e8', 'report_export', 9, 'overview:csv', 1, 0, NULL, NULL, 1, '2026-08-31 20:15:45.056', '2026-08-31 20:15:45.056'),
(84, 1, 2, 'SRC-studio_analytics-report_export-11', 'report', 'studio_analytics', 'Ringkasan Analitik', 'Ekspor overview (CSV)', 'UNI-NEXUS_Studio_Ringkasan_Analitik_2026-08-01_2026-08-31.csv', 'reports/011b5652-dd15-4de1-a19c-cd31fe91dfee.csv', 'text/csv; charset=utf-8', 4806, '627da6df67700c40b7094b118dffce0555086c45e335999f974dcea558898b71', 'report_export', 11, 'overview:csv', 1, 0, NULL, NULL, 1, '2026-08-31 22:47:31.019', '2026-08-31 22:47:31.019');

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
(217, 1, 2, '5e2012e8-aa06-4fa8-91bc-a1fc54f5ec23', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 5, 'TRF-000005', 2, '333336a7-ea48-447a-a36d-79893b4348c5', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 5, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000005\"}}}', 'processed', '2026-08-28 01:30:53.259', NULL, NULL, 0, '2026-08-28 01:30:53.499', NULL, '2026-08-28 08:30:53.259'),
(218, 1, 2, '145e89c2-fd47-4704-9f18-fac0edfd4e85', 'studio.finance.payment_received', 'studio_finance', 'payment', 8, 'PAY-8', 2, '6c515aab-5795-4c75-be67-e1716374cefe', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 8, \"amount\": 2000000, \"invoice_id\": 27, \"project_id\": 37}}}', 'processed', '2026-08-28 01:30:53.319', NULL, NULL, 0, '2026-08-28 01:30:53.502', NULL, '2026-08-28 08:30:53.319'),
(233, 1, 2, 'c1b54d08-68a2-43d9-967b-46ba3c0c8a11', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 6, 'TRF-000006', 2, '11cddcc1-f93d-4b0b-982f-bfbf835666db', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 6, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000006\"}}}', 'processed', '2026-08-28 03:17:30.705', NULL, NULL, 0, '2026-08-28 03:17:31.194', NULL, '2026-08-28 10:17:30.705'),
(234, 1, 2, '64306bf9-c0fc-4dfc-a890-2a5be1e1e366', 'studio.finance.payment_received', 'studio_finance', 'payment', 10, 'PAY-10', 2, '35baa373-5937-4a3b-9ee0-9000bc525e44', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 10, \"amount\": 2000000, \"invoice_id\": 33, \"project_id\": 40}}}', 'processed', '2026-08-28 03:17:30.770', NULL, NULL, 0, '2026-08-28 03:17:31.198', NULL, '2026-08-28 10:17:30.770'),
(263, 1, 2, 'd63cfc26-6d5e-4c16-a927-6a9a10926259', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 7, 'TRF-000007', 2, 'd84c7524-8ee1-47fa-8fd8-a45a49cf6dfa', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 7, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000007\"}}}', 'processed', '2026-08-28 04:33:46.358', NULL, NULL, 0, '2026-08-28 04:33:46.644', NULL, '2026-08-28 11:33:46.358'),
(264, 1, 2, 'adf292b0-6b82-40d9-90f5-7907e6740e5d', 'studio.finance.payment_received', 'studio_finance', 'payment', 13, 'PAY-13', 2, 'f1d9d175-a447-4bf0-a7cd-18612239fd1e', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 13, \"amount\": 2000000, \"invoice_id\": 42, \"project_id\": 43}}}', 'processed', '2026-08-28 04:33:46.429', NULL, NULL, 0, '2026-08-28 04:33:46.647', NULL, '2026-08-28 11:33:46.429'),
(293, 1, 2, '0c938cf0-b9fe-4378-9129-c0a2240d102f', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 8, 'TRF-000008', 2, '9727565c-df46-4a52-bfe6-16708368ae5e', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 8, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000008\"}}}', 'processed', '2026-08-28 08:19:23.465', NULL, NULL, 0, '2026-08-28 08:19:27.948', NULL, '2026-08-28 15:19:23.465'),
(294, 1, 2, '8833c576-5a80-4468-be54-974674799e6a', 'studio.finance.payment_received', 'studio_finance', 'payment', 16, 'PAY-16', 2, 'c57dc9a6-f3b3-4607-8d0b-11a72e8885c7', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 16, \"amount\": 2000000, \"invoice_id\": 55, \"project_id\": 50}}}', 'processed', '2026-08-28 08:19:23.585', NULL, NULL, 0, '2026-08-28 08:19:28.681', NULL, '2026-08-28 15:19:23.585'),
(327, 1, 2, '5a9095d7-6b62-45b8-a475-873d0ecc75ba', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 9, 'TRF-000009', 2, 'a128f23b-ab10-4183-95d8-e356a9ac6bba', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 9, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000009\"}}}', 'processed', '2026-08-30 07:03:52.947', NULL, NULL, 0, '2026-08-30 07:03:53.215', NULL, '2026-08-30 14:03:52.947'),
(328, 1, 2, '2104a947-0df7-45b0-b8f7-c6b9bddfc44a', 'studio.finance.payment_received', 'studio_finance', 'payment', 17, 'PAY-17', 2, 'd2eb9470-7d50-40eb-b9ff-a30c819358e0', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 17, \"amount\": 2000000, \"invoice_id\": 57, \"project_id\": 59}}}', 'processed', '2026-08-30 07:03:53.025', NULL, NULL, 0, '2026-08-30 07:03:53.263', NULL, '2026-08-30 14:03:53.025'),
(332, 1, 2, '0488a617-c52a-473e-8323-8f2a90f7040b', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 10, 'TRF-000010', 2, '9f2475bf-0985-4e67-8a6e-9fdee3ab0fb0', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 10, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000010\"}}}', 'processed', '2026-08-31 02:23:48.294', NULL, NULL, 0, '2026-08-31 02:23:48.444', NULL, '2026-08-31 09:23:48.294'),
(333, 1, 2, 'e7924958-ddcd-42d7-9d3e-84cda7e2d333', 'studio.finance.payment_received', 'studio_finance', 'payment', 18, 'PAY-18', 2, 'c0847993-c842-4624-98f5-65e033c5f2b0', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 18, \"amount\": 2000000, \"invoice_id\": 58, \"project_id\": 62}}}', 'processed', '2026-08-31 02:23:48.367', NULL, NULL, 0, '2026-08-31 02:23:48.493', NULL, '2026-08-31 09:23:48.367'),
(362, 1, 2, '2eb45b98-ad0e-4245-9160-a5f9b31c7ef4', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 13, 'TRF-000013', 2, '2ece8fcc-6b02-4947-9e8c-0caf4320e8ac', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 13, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000013\"}}}', 'processed', '2026-08-31 05:43:22.164', NULL, NULL, 0, '2026-08-31 05:43:22.454', NULL, '2026-08-31 12:43:22.164'),
(363, 1, 2, 'd932e05a-7340-41d1-9839-c49c4c8437aa', 'studio.finance.payment_received', 'studio_finance', 'payment', 21, 'PAY-21', 2, 'cfe604df-7ebf-4232-867d-b9409e65d6dd', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 21, \"amount\": 2000000, \"invoice_id\": 68, \"project_id\": 66}}}', 'processed', '2026-08-31 05:43:22.241', NULL, NULL, 0, '2026-08-31 05:43:22.500', NULL, '2026-08-31 12:43:22.241'),
(389, 1, 2, '829c5a03-add5-4297-bf8c-f908661b7859', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 17, 'TRF-000017', 2, '6f25a98a-76b3-4825-90e7-a0c2620cf627', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 17, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000017\"}}}', 'processed', '2026-08-31 05:54:07.978', NULL, NULL, 0, '2026-08-31 05:54:08.033', NULL, '2026-08-31 12:54:07.978'),
(390, 1, 2, '12b3a3ec-1333-4f3b-b1de-e2b8a63808c6', 'studio.finance.payment_received', 'studio_finance', 'payment', 23, 'PAY-23', 2, '5a8a4c89-a005-4618-a09a-136837c9bd97', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 23, \"amount\": 2000000, \"invoice_id\": 74, \"project_id\": 71}}}', 'processed', '2026-08-31 05:54:08.051', NULL, NULL, 0, '2026-08-31 05:54:08.114', NULL, '2026-08-31 12:54:08.051'),
(391, 1, 2, 'c24a5b41-f92c-4711-89f0-f093c1c50c2c', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 21, 'TRF-000021', 2, 'e78b4107-60ad-46ad-b7ce-08bd30cf557c', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 21, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000021\"}}}', 'processed', '2026-08-31 05:54:45.694', NULL, NULL, 0, '2026-08-31 05:54:45.752', NULL, '2026-08-31 12:54:45.694'),
(392, 1, 2, '4fe12639-3648-4d93-b852-5bed5fb4397c', 'studio.finance.payment_received', 'studio_finance', 'payment', 24, 'PAY-24', 2, 'aef4e10f-1e07-4c98-82cc-1ebb9c71902c', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 24, \"amount\": 2000000, \"invoice_id\": 75, \"project_id\": 72}}}', 'processed', '2026-08-31 05:54:45.780', NULL, NULL, 0, '2026-08-31 05:54:46.903', NULL, '2026-08-31 12:54:45.780'),
(393, 1, 2, '1e990e43-1dda-4b0b-b2f6-6fcd47e47b3f', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 28, 'TRF-000028', 2, '29821d3d-1e90-4e4c-a0de-cbb0ed406e5f', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 28, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000028\"}}}', 'processed', '2026-08-31 06:06:35.203', NULL, NULL, 0, '2026-08-31 06:06:35.412', NULL, '2026-08-31 13:06:35.203'),
(394, 1, 2, '50932c1b-c2a5-4d91-8783-08c6a02b9d2b', 'studio.finance.payment_received', 'studio_finance', 'payment', 29, 'PAY-29', 2, 'e99726b0-2eed-4380-8c94-0a11bda304bb', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 29, \"amount\": 2000000, \"invoice_id\": 78, \"project_id\": 73}}}', 'processed', '2026-08-31 06:06:35.293', NULL, NULL, 0, '2026-08-31 06:06:35.482', NULL, '2026-08-31 13:06:35.293'),
(395, 1, 2, '2e80c4f2-63f5-407a-a6d1-6b912ef89aa4', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 29, 'TRF-000029', 2, 'cfcd5808-88de-4338-8fcc-481c10c161e7', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 29, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000029\"}}}', 'processed', '2026-08-31 06:07:30.278', NULL, NULL, 0, '2026-08-31 06:07:30.703', NULL, '2026-08-31 13:07:30.278'),
(396, 1, 2, '210e48a2-0c08-4e3e-94ab-20a8b35fae37', 'studio.finance.payment_received', 'studio_finance', 'payment', 30, 'PAY-30', 2, 'f5ad2216-9d54-43a0-82a9-2884ecc270a5', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 30, \"amount\": 2000000, \"invoice_id\": 79, \"project_id\": 74}}}', 'processed', '2026-08-31 06:07:30.397', NULL, NULL, 0, '2026-08-31 06:07:30.778', NULL, '2026-08-31 13:07:30.397'),
(397, 1, 2, 'f73cfac2-caf5-4f04-bb96-31188b33dcfe', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 33, 'TRF-000033', 2, '0315a63b-2200-4094-a26a-0937e8f62492', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 33, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000033\"}}}', 'processed', '2026-08-31 06:18:35.260', NULL, NULL, 0, '2026-08-31 06:18:35.783', NULL, '2026-08-31 13:18:35.260'),
(398, 1, 2, 'd9bece8a-8687-4c52-bb3a-c046fca819b0', 'studio.finance.payment_received', 'studio_finance', 'payment', 35, 'PAY-35', 2, '4bf2ea6d-1632-4d72-a3fb-71c5763e674b', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 35, \"amount\": 2000000, \"invoice_id\": 82, \"project_id\": 75}}}', 'processed', '2026-08-31 06:18:35.336', NULL, NULL, 0, '2026-08-31 06:18:36.030', NULL, '2026-08-31 13:18:35.336'),
(432, 1, 2, 'b10f2920-24cf-4caf-bb0b-a3c437ff1221', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 35, 'TRF-000035', 2, 'c3aec176-d8e6-4160-abda-cdf12844d301', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 35, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000035\"}}}', 'processed', '2026-08-31 08:46:53.575', NULL, NULL, 0, '2026-08-31 08:46:54.604', NULL, '2026-08-31 15:46:53.575'),
(433, 1, 2, '660c03b7-f55a-4ff3-824f-f751e4fd160d', 'studio.finance.payment_received', 'studio_finance', 'payment', 37, 'PAY-37', 2, 'a71d6cae-2c8c-4703-b5e3-7c65c6b7e1fb', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 37, \"amount\": 2000000, \"invoice_id\": 88, \"project_id\": 81}}}', 'processed', '2026-08-31 08:46:53.680', NULL, NULL, 0, '2026-08-31 08:46:54.654', NULL, '2026-08-31 15:46:53.680'),
(470, 1, 2, '288be79c-3da6-4198-960b-26dea33254d2', 'studio.finance.treasury_transfer_completed', 'studio_finance', 'internal_transfer', 39, 'TRF-000039', 2, 'af5c6a3f-520f-4d6a-b5ae-34de818155c3', NULL, NULL, 0, '{\"context\": {\"transfer\": {\"id\": 39, \"amount\": 1000000, \"currency_code\": \"IDR\", \"transfer_code\": \"TRF-000039\"}}}', 'processed', '2026-09-01 01:02:09.405', NULL, NULL, 0, '2026-09-01 01:02:09.514', NULL, '2026-09-01 08:02:09.405'),
(471, 1, 2, '903c24d9-dab7-405b-a313-84f78d0321d8', 'studio.finance.payment_received', 'studio_finance', 'payment', 45, 'PAY-45', 2, '1082b017-1639-4f70-8eee-21600197ea79', NULL, NULL, 0, '{\"context\": {\"payment\": {\"id\": 45, \"amount\": 2000000, \"invoice_id\": 98, \"project_id\": 90}}}', 'processed', '2026-09-01 01:02:09.475', NULL, NULL, 0, '2026-09-01 01:02:09.558', NULL, '2026-09-01 08:02:09.475');

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
(2, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace f00d7d44-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:04:42.339'),
(3, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace f00d7d44-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:04:42.346'),
(4, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace f00d7d44-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:04:42.352'),
(5, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace f00d7d44-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:04:42.357'),
(6, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace f00d7d44-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:04:42.364'),
(7, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace f00d7d44-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:04:42.368'),
(8, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace f00d7d44-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:04:42.372'),
(9, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace f00d7d44-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:04:42.379'),
(10, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace f00d7d44-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:04:42.383'),
(14, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 80dd94a3-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:05:28.410'),
(15, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 80dd94a3-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:28.414'),
(16, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 80dd94a3-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:28.420'),
(17, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 80dd94a3-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:28.424'),
(18, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 80dd94a3-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:28.428'),
(19, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 80dd94a3-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:28.434'),
(20, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 80dd94a3-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:28.438'),
(21, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 80dd94a3-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:28.442'),
(22, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 80dd94a3-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:28.446'),
(25, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 80dd94a3-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055263:policy:smoke-order-created:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:05:28.467'),
(26, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 80dd94a3-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055263:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 09:05:28.472'),
(27, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 80dd94a3-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055263:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 09:05:28.477'),
(28, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 80dd94a3-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055263:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 09:05:28.485'),
(29, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 80dd94a3-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055263:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 09:05:28.490'),
(30, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 80dd94a3-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055263:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 09:05:28.496'),
(31, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 80dd94a3-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055263:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 09:05:28.505'),
(32, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 80dd94a3-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055263:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 09:05:28.536'),
(33, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 80dd94a3-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055263:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 09:05:28.541'),
(45, 1, 1, 2, 'automation', 'automations', 'info', 'Automation 80dd94a3-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8055256:action:0:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:05:28.608'),
(46, 1, 1, 3, 'automation', 'automations', 'info', 'Automation 80dd94a3-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8055256:action:0:user:3', 0, NULL, '2026-08-30 09:05:28.611'),
(47, 1, 1, 4, 'automation', 'automations', 'info', 'Automation 80dd94a3-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8055256:action:0:user:4', 0, NULL, '2026-08-30 09:05:28.615'),
(48, 1, 1, 5, 'automation', 'automations', 'info', 'Automation 80dd94a3-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8055256:action:0:user:5', 0, NULL, '2026-08-30 09:05:28.620'),
(49, 1, 1, 6, 'automation', 'automations', 'info', 'Automation 80dd94a3-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8055256:action:0:user:6', 0, NULL, '2026-08-30 09:05:28.623'),
(50, 1, 1, 7, 'automation', 'automations', 'info', 'Automation 80dd94a3-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8055256:action:0:user:7', 0, NULL, '2026-08-30 09:05:28.627'),
(51, 1, 1, 8, 'automation', 'automations', 'info', 'Automation 80dd94a3-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8055256:action:0:user:8', 0, NULL, '2026-08-30 09:05:28.630'),
(52, 1, 1, 9, 'automation', 'automations', 'info', 'Automation 80dd94a3-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8055256:action:0:user:9', 0, NULL, '2026-08-30 09:05:28.635'),
(53, 1, 1, 10, 'automation', 'automations', 'info', 'Automation 80dd94a3-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8055256:action:0:user:10', 0, NULL, '2026-08-30 09:05:28.639'),
(59, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace d8646edf-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:05:56.462'),
(60, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace d8646edf-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:56.467'),
(61, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace d8646edf-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:56.471'),
(62, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace d8646edf-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:56.475'),
(63, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace d8646edf-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:56.482'),
(64, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace d8646edf-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:56.487'),
(65, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace d8646edf-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:56.491'),
(66, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace d8646edf-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:56.497'),
(67, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace d8646edf-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:05:56.501'),
(70, 1, 1, 2, 'system', 'craft_orders', 'info', 'System d8646edf-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074981:policy:smoke-order-created:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:05:56.539'),
(71, 1, 1, 3, 'system', 'craft_orders', 'info', 'System d8646edf-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074981:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 09:05:56.552'),
(72, 1, 1, 4, 'system', 'craft_orders', 'info', 'System d8646edf-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074981:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 09:05:56.556'),
(73, 1, 1, 5, 'system', 'craft_orders', 'info', 'System d8646edf-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074981:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 09:05:56.562'),
(74, 1, 1, 6, 'system', 'craft_orders', 'info', 'System d8646edf-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074981:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 09:05:56.566'),
(75, 1, 1, 7, 'system', 'craft_orders', 'info', 'System d8646edf-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074981:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 09:05:56.570'),
(76, 1, 1, 8, 'system', 'craft_orders', 'info', 'System d8646edf-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074981:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 09:05:56.574'),
(77, 1, 1, 9, 'system', 'craft_orders', 'info', 'System d8646edf-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074981:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 09:05:56.580'),
(78, 1, 1, 10, 'system', 'craft_orders', 'info', 'System d8646edf-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074981:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 09:05:56.586'),
(90, 1, 1, 2, 'automation', 'automations', 'info', 'Automation d8646edf-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011090:action:0:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:05:56.661'),
(91, 1, 1, 3, 'automation', 'automations', 'info', 'Automation d8646edf-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011090:action:0:user:3', 0, NULL, '2026-08-30 09:05:56.665'),
(92, 1, 1, 4, 'automation', 'automations', 'info', 'Automation d8646edf-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011090:action:0:user:4', 0, NULL, '2026-08-30 09:05:56.672'),
(93, 1, 1, 5, 'automation', 'automations', 'info', 'Automation d8646edf-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011090:action:0:user:5', 0, NULL, '2026-08-30 09:05:56.675'),
(94, 1, 1, 6, 'automation', 'automations', 'info', 'Automation d8646edf-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011090:action:0:user:6', 0, NULL, '2026-08-30 09:05:56.680'),
(95, 1, 1, 7, 'automation', 'automations', 'info', 'Automation d8646edf-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011090:action:0:user:7', 0, NULL, '2026-08-30 09:05:56.685'),
(96, 1, 1, 8, 'automation', 'automations', 'info', 'Automation d8646edf-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011090:action:0:user:8', 0, NULL, '2026-08-30 09:05:56.689'),
(97, 1, 1, 9, 'automation', 'automations', 'info', 'Automation d8646edf-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011090:action:0:user:9', 0, NULL, '2026-08-30 09:05:56.692'),
(98, 1, 1, 10, 'automation', 'automations', 'info', 'Automation d8646edf-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011090:action:0:user:10', 0, NULL, '2026-08-30 09:05:56.698'),
(104, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace c6e10d88-6', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:07:00.299'),
(105, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace c6e10d88-6', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:00.304'),
(106, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace c6e10d88-6', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:00.308'),
(107, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace c6e10d88-6', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:00.312'),
(108, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace c6e10d88-6', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:00.320'),
(109, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace c6e10d88-6', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:00.324'),
(110, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace c6e10d88-6', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:00.329'),
(111, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace c6e10d88-6', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:00.336'),
(112, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace c6e10d88-6', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:00.342'),
(115, 1, 1, 2, 'system', 'craft_orders', 'info', 'System c6e10d88-6', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9047324:policy:smoke-order-created:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:07:00.367'),
(116, 1, 1, 3, 'system', 'craft_orders', 'info', 'System c6e10d88-6', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9047324:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 09:07:00.386'),
(117, 1, 1, 4, 'system', 'craft_orders', 'info', 'System c6e10d88-6', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9047324:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 09:07:00.392'),
(118, 1, 1, 5, 'system', 'craft_orders', 'info', 'System c6e10d88-6', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9047324:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 09:07:00.400'),
(119, 1, 1, 6, 'system', 'craft_orders', 'info', 'System c6e10d88-6', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9047324:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 09:07:00.404'),
(120, 1, 1, 7, 'system', 'craft_orders', 'info', 'System c6e10d88-6', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9047324:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 09:07:00.408'),
(121, 1, 1, 8, 'system', 'craft_orders', 'info', 'System c6e10d88-6', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9047324:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 09:07:00.412'),
(122, 1, 1, 9, 'system', 'craft_orders', 'info', 'System c6e10d88-6', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9047324:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 09:07:00.418'),
(123, 1, 1, 10, 'system', 'craft_orders', 'info', 'System c6e10d88-6', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9047324:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 09:07:00.422'),
(135, 1, 1, 2, 'automation', 'automations', 'info', 'Automation c6e10d88-6', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8078885:action:0:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:07:00.504'),
(136, 1, 1, 3, 'automation', 'automations', 'info', 'Automation c6e10d88-6', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8078885:action:0:user:3', 0, NULL, '2026-08-30 09:07:00.511'),
(137, 1, 1, 4, 'automation', 'automations', 'info', 'Automation c6e10d88-6', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8078885:action:0:user:4', 0, NULL, '2026-08-30 09:07:00.521'),
(138, 1, 1, 5, 'automation', 'automations', 'info', 'Automation c6e10d88-6', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8078885:action:0:user:5', 0, NULL, '2026-08-30 09:07:00.524'),
(139, 1, 1, 6, 'automation', 'automations', 'info', 'Automation c6e10d88-6', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8078885:action:0:user:6', 0, NULL, '2026-08-30 09:07:00.527'),
(140, 1, 1, 7, 'automation', 'automations', 'info', 'Automation c6e10d88-6', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8078885:action:0:user:7', 0, NULL, '2026-08-30 09:07:00.534'),
(141, 1, 1, 8, 'automation', 'automations', 'info', 'Automation c6e10d88-6', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8078885:action:0:user:8', 0, NULL, '2026-08-30 09:07:00.538'),
(142, 1, 1, 9, 'automation', 'automations', 'info', 'Automation c6e10d88-6', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8078885:action:0:user:9', 0, NULL, '2026-08-30 09:07:00.542'),
(143, 1, 1, 10, 'automation', 'automations', 'info', 'Automation c6e10d88-6', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8078885:action:0:user:10', 0, NULL, '2026-08-30 09:07:00.545'),
(149, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 45d21905-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:07:52.547'),
(150, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 45d21905-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:52.551'),
(151, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 45d21905-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:52.560'),
(152, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 45d21905-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:52.565'),
(153, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 45d21905-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:52.569'),
(154, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 45d21905-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:52.579'),
(155, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 45d21905-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:52.583'),
(156, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 45d21905-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:52.590'),
(157, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 45d21905-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:07:52.596'),
(160, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 45d21905-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9017490:policy:smoke-order-created:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:07:52.625'),
(161, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 45d21905-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9017490:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 09:07:52.631'),
(162, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 45d21905-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9017490:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 09:07:52.635'),
(163, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 45d21905-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9017490:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 09:07:52.647'),
(164, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 45d21905-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9017490:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 09:07:52.652'),
(165, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 45d21905-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9017490:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 09:07:52.663'),
(166, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 45d21905-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9017490:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 09:07:52.667'),
(167, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 45d21905-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9017490:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 09:07:52.673'),
(168, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 45d21905-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9017490:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 09:07:52.679'),
(180, 1, 1, 2, 'automation', 'automations', 'info', 'Automation 45d21905-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8007904:action:0:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:07:52.782'),
(181, 1, 1, 3, 'automation', 'automations', 'info', 'Automation 45d21905-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8007904:action:0:user:3', 0, NULL, '2026-08-30 09:07:52.785'),
(182, 1, 1, 4, 'automation', 'automations', 'info', 'Automation 45d21905-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8007904:action:0:user:4', 0, NULL, '2026-08-30 09:07:52.791'),
(183, 1, 1, 5, 'automation', 'automations', 'info', 'Automation 45d21905-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8007904:action:0:user:5', 0, NULL, '2026-08-30 09:07:52.795'),
(184, 1, 1, 6, 'automation', 'automations', 'info', 'Automation 45d21905-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8007904:action:0:user:6', 0, NULL, '2026-08-30 09:07:52.798'),
(185, 1, 1, 7, 'automation', 'automations', 'info', 'Automation 45d21905-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8007904:action:0:user:7', 0, NULL, '2026-08-30 09:07:52.801'),
(186, 1, 1, 8, 'automation', 'automations', 'info', 'Automation 45d21905-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8007904:action:0:user:8', 0, NULL, '2026-08-30 09:07:52.813'),
(187, 1, 1, 9, 'automation', 'automations', 'info', 'Automation 45d21905-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8007904:action:0:user:9', 0, NULL, '2026-08-30 09:07:52.816'),
(188, 1, 1, 10, 'automation', 'automations', 'info', 'Automation 45d21905-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8007904:action:0:user:10', 0, NULL, '2026-08-30 09:07:52.823'),
(194, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace ba18edaf-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:08:51.685'),
(195, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace ba18edaf-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:08:51.711'),
(196, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace ba18edaf-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:08:51.717'),
(197, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace ba18edaf-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:08:51.721'),
(198, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace ba18edaf-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:08:51.728'),
(199, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace ba18edaf-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:08:51.737'),
(200, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace ba18edaf-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:08:51.742'),
(201, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace ba18edaf-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:08:51.749'),
(202, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace ba18edaf-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:08:51.753'),
(205, 1, 1, 2, 'system', 'craft_orders', 'info', 'System ba18edaf-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9037030:policy:smoke-order-created:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:08:51.822'),
(206, 1, 1, 3, 'system', 'craft_orders', 'info', 'System ba18edaf-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9037030:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 09:08:51.828'),
(207, 1, 1, 4, 'system', 'craft_orders', 'info', 'System ba18edaf-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9037030:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 09:08:51.834'),
(208, 1, 1, 5, 'system', 'craft_orders', 'info', 'System ba18edaf-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9037030:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 09:08:51.839'),
(209, 1, 1, 6, 'system', 'craft_orders', 'info', 'System ba18edaf-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9037030:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 09:08:51.849'),
(210, 1, 1, 7, 'system', 'craft_orders', 'info', 'System ba18edaf-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9037030:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 09:08:51.854'),
(211, 1, 1, 8, 'system', 'craft_orders', 'info', 'System ba18edaf-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9037030:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 09:08:51.858'),
(212, 1, 1, 9, 'system', 'craft_orders', 'info', 'System ba18edaf-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9037030:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 09:08:51.864'),
(213, 1, 1, 10, 'system', 'craft_orders', 'info', 'System ba18edaf-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9037030:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 09:08:51.878'),
(225, 1, 1, 2, 'automation', 'automations', 'info', 'Automation ba18edaf-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8074525:action:0:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:08:52.013'),
(226, 1, 1, 3, 'automation', 'automations', 'info', 'Automation ba18edaf-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8074525:action:0:user:3', 0, NULL, '2026-08-30 09:08:52.025'),
(227, 1, 1, 4, 'automation', 'automations', 'info', 'Automation ba18edaf-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8074525:action:0:user:4', 0, NULL, '2026-08-30 09:08:52.040'),
(228, 1, 1, 5, 'automation', 'automations', 'info', 'Automation ba18edaf-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8074525:action:0:user:5', 0, NULL, '2026-08-30 09:08:52.051'),
(229, 1, 1, 6, 'automation', 'automations', 'info', 'Automation ba18edaf-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8074525:action:0:user:6', 0, NULL, '2026-08-30 09:08:52.054'),
(230, 1, 1, 7, 'automation', 'automations', 'info', 'Automation ba18edaf-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8074525:action:0:user:7', 0, NULL, '2026-08-30 09:08:52.057'),
(231, 1, 1, 8, 'automation', 'automations', 'info', 'Automation ba18edaf-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8074525:action:0:user:8', 0, NULL, '2026-08-30 09:08:52.063'),
(232, 1, 1, 9, 'automation', 'automations', 'info', 'Automation ba18edaf-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8074525:action:0:user:9', 0, NULL, '2026-08-30 09:08:52.068'),
(233, 1, 1, 10, 'automation', 'automations', 'info', 'Automation ba18edaf-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8074525:action:0:user:10', 0, NULL, '2026-08-30 09:08:52.086'),
(239, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:295:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 09:10:09.578'),
(240, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:295:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 09:10:09.585'),
(241, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:295:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 09:10:09.589'),
(242, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:295:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 09:10:09.592'),
(243, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:295:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 09:10:09.600'),
(244, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:295:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 09:10:09.603'),
(245, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:295:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 09:10:09.606'),
(246, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:295:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 09:10:09.609'),
(247, 1, 2, 3, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:296:policy:studio-project-created:user:3', 0, NULL, '2026-08-30 09:10:29.046'),
(248, 1, 2, 4, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:296:policy:studio-project-created:user:4', 0, NULL, '2026-08-30 09:10:29.050'),
(249, 1, 2, 10, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:296:policy:studio-project-created:user:10', 0, NULL, '2026-08-30 09:10:29.054'),
(250, 1, 2, 8, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:296:policy:studio-project-created:user:8', 0, NULL, '2026-08-30 09:10:29.061'),
(251, 1, 2, 7, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:296:policy:studio-project-created:user:7', 0, NULL, '2026-08-30 09:10:29.066'),
(252, 1, 2, 6, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:296:policy:studio-project-created:user:6', 0, NULL, '2026-08-30 09:10:29.070'),
(253, 1, 2, 5, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:296:policy:studio-project-created:user:5', 0, NULL, '2026-08-30 09:10:29.077'),
(254, 1, 2, 9, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:296:policy:studio-project-created:user:9', 0, NULL, '2026-08-30 09:10:29.082'),
(255, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 5, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:15:01.999'),
(256, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 5, NULL, 0, NULL, '2026-08-30 09:15:02.000'),
(257, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 5, NULL, 0, NULL, '2026-08-30 09:15:02.004'),
(258, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 6, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:15:02.051'),
(259, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 6, NULL, 0, NULL, '2026-08-30 09:15:02.054'),
(260, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 6, NULL, 0, NULL, '2026-08-30 09:15:02.058'),
(261, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 5, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:15:02.282'),
(262, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 5, NULL, 0, NULL, '2026-08-30 09:15:02.284'),
(263, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 5, NULL, 0, NULL, '2026-08-30 09:15:02.287'),
(264, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 6, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:15:02.466'),
(265, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 6, NULL, 0, NULL, '2026-08-30 09:15:02.469'),
(266, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 6, NULL, 0, NULL, '2026-08-30 09:15:02.472'),
(270, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 9a6aa230-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:17:44.028'),
(271, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 9a6aa230-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:17:44.032'),
(272, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 9a6aa230-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:17:44.036'),
(273, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 9a6aa230-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:17:44.046'),
(274, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 9a6aa230-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:17:44.052'),
(275, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 9a6aa230-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:17:44.059'),
(276, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 9a6aa230-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:17:44.063'),
(277, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 9a6aa230-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:17:44.068'),
(278, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 9a6aa230-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:17:44.080'),
(281, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 9a6aa230-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9062239:policy:smoke-order-created:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:17:44.107'),
(282, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 9a6aa230-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9062239:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 09:17:44.112'),
(283, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 9a6aa230-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9062239:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 09:17:44.147'),
(284, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 9a6aa230-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9062239:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 09:17:44.157'),
(285, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 9a6aa230-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9062239:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 09:17:44.163'),
(286, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 9a6aa230-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9062239:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 09:17:44.168'),
(287, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 9a6aa230-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9062239:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 09:17:44.176'),
(288, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 9a6aa230-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9062239:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 09:17:44.180'),
(289, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 9a6aa230-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9062239:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 09:17:44.184'),
(301, 1, 1, 2, 'automation', 'automations', 'info', 'Automation 9a6aa230-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8035275:action:0:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:17:44.371'),
(302, 1, 1, 3, 'automation', 'automations', 'info', 'Automation 9a6aa230-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8035275:action:0:user:3', 0, NULL, '2026-08-30 09:17:44.376'),
(303, 1, 1, 4, 'automation', 'automations', 'info', 'Automation 9a6aa230-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8035275:action:0:user:4', 0, NULL, '2026-08-30 09:17:44.379'),
(304, 1, 1, 5, 'automation', 'automations', 'info', 'Automation 9a6aa230-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8035275:action:0:user:5', 0, NULL, '2026-08-30 09:17:44.383'),
(305, 1, 1, 6, 'automation', 'automations', 'info', 'Automation 9a6aa230-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8035275:action:0:user:6', 0, NULL, '2026-08-30 09:17:44.386'),
(306, 1, 1, 7, 'automation', 'automations', 'info', 'Automation 9a6aa230-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8035275:action:0:user:7', 0, NULL, '2026-08-30 09:17:44.392'),
(307, 1, 1, 8, 'automation', 'automations', 'info', 'Automation 9a6aa230-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8035275:action:0:user:8', 0, NULL, '2026-08-30 09:17:44.395'),
(308, 1, 1, 9, 'automation', 'automations', 'info', 'Automation 9a6aa230-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8035275:action:0:user:9', 0, NULL, '2026-08-30 09:17:44.399'),
(309, 1, 1, 10, 'automation', 'automations', 'info', 'Automation 9a6aa230-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8035275:action:0:user:10', 0, NULL, '2026-08-30 09:17:44.403'),
(318, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 52073115-2', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:24:14.106'),
(319, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 52073115-2', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:24:14.112'),
(320, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 52073115-2', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:24:14.117'),
(321, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 52073115-2', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:24:14.121'),
(322, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 52073115-2', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:24:14.124'),
(323, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 52073115-2', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:24:14.129'),
(324, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 52073115-2', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:24:14.133'),
(325, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 52073115-2', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:24:14.137'),
(326, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 52073115-2', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:24:14.140'),
(329, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 52073115-2', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9010507:policy:smoke-order-created:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:24:14.159'),
(330, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 52073115-2', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9010507:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 09:24:14.167'),
(331, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 52073115-2', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9010507:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 09:24:14.170'),
(332, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 52073115-2', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9010507:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 09:24:14.173'),
(333, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 52073115-2', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9010507:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 09:24:14.176'),
(334, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 52073115-2', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9010507:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 09:24:14.182'),
(335, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 52073115-2', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9010507:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 09:24:14.185'),
(336, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 52073115-2', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9010507:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 09:24:14.188'),
(337, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 52073115-2', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9010507:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 09:24:14.191'),
(349, 1, 1, 2, 'automation', 'automations', 'info', 'Automation 52073115-2', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8095318:action:0:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:24:14.253'),
(350, 1, 1, 3, 'automation', 'automations', 'info', 'Automation 52073115-2', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8095318:action:0:user:3', 0, NULL, '2026-08-30 09:24:14.256'),
(351, 1, 1, 4, 'automation', 'automations', 'info', 'Automation 52073115-2', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8095318:action:0:user:4', 0, NULL, '2026-08-30 09:24:14.259'),
(352, 1, 1, 5, 'automation', 'automations', 'info', 'Automation 52073115-2', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8095318:action:0:user:5', 0, NULL, '2026-08-30 09:24:14.264'),
(353, 1, 1, 6, 'automation', 'automations', 'info', 'Automation 52073115-2', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8095318:action:0:user:6', 0, NULL, '2026-08-30 09:24:14.267'),
(354, 1, 1, 7, 'automation', 'automations', 'info', 'Automation 52073115-2', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8095318:action:0:user:7', 0, NULL, '2026-08-30 09:24:14.269'),
(355, 1, 1, 8, 'automation', 'automations', 'info', 'Automation 52073115-2', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8095318:action:0:user:8', 0, NULL, '2026-08-30 09:24:14.272'),
(356, 1, 1, 9, 'automation', 'automations', 'info', 'Automation 52073115-2', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8095318:action:0:user:9', 0, NULL, '2026-08-30 09:24:14.276'),
(357, 1, 1, 10, 'automation', 'automations', 'info', 'Automation 52073115-2', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8095318:action:0:user:10', 0, NULL, '2026-08-30 09:24:14.281'),
(364, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace f2bf8888-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:26:22.780'),
(365, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace f2bf8888-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:26:22.784'),
(366, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace f2bf8888-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:26:22.791'),
(367, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace f2bf8888-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:26:22.796'),
(368, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace f2bf8888-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:26:22.801'),
(369, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace f2bf8888-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:26:22.811'),
(370, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace f2bf8888-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:26:22.815'),
(371, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace f2bf8888-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:26:22.822'),
(372, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace f2bf8888-8', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:26:22.829'),
(375, 1, 1, 2, 'system', 'craft_orders', 'info', 'System f2bf8888-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9022396:policy:smoke-order-created:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:26:22.854'),
(376, 1, 1, 3, 'system', 'craft_orders', 'info', 'System f2bf8888-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9022396:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 09:26:22.860');
INSERT INTO `notifications` (`id`, `organization_id`, `business_unit_id`, `user_id`, `notification_type`, `module_code`, `severity_code`, `title`, `message`, `action_url`, `entity_type`, `entity_id`, `dedupe_key`, `is_read`, `read_at`, `created_at`) VALUES
(377, 1, 1, 4, 'system', 'craft_orders', 'info', 'System f2bf8888-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9022396:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 09:26:22.865'),
(378, 1, 1, 5, 'system', 'craft_orders', 'info', 'System f2bf8888-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9022396:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 09:26:22.871'),
(379, 1, 1, 6, 'system', 'craft_orders', 'info', 'System f2bf8888-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9022396:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 09:26:22.875'),
(380, 1, 1, 7, 'system', 'craft_orders', 'info', 'System f2bf8888-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9022396:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 09:26:22.879'),
(381, 1, 1, 8, 'system', 'craft_orders', 'info', 'System f2bf8888-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9022396:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 09:26:22.886'),
(382, 1, 1, 9, 'system', 'craft_orders', 'info', 'System f2bf8888-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9022396:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 09:26:22.893'),
(383, 1, 1, 10, 'system', 'craft_orders', 'info', 'System f2bf8888-8', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9022396:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 09:26:22.898'),
(395, 1, 1, 2, 'automation', 'automations', 'info', 'Automation f2bf8888-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088800:action:0:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:26:22.994'),
(396, 1, 1, 3, 'automation', 'automations', 'info', 'Automation f2bf8888-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088800:action:0:user:3', 0, NULL, '2026-08-30 09:26:22.998'),
(397, 1, 1, 4, 'automation', 'automations', 'info', 'Automation f2bf8888-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088800:action:0:user:4', 0, NULL, '2026-08-30 09:26:23.004'),
(398, 1, 1, 5, 'automation', 'automations', 'info', 'Automation f2bf8888-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088800:action:0:user:5', 0, NULL, '2026-08-30 09:26:23.010'),
(399, 1, 1, 6, 'automation', 'automations', 'info', 'Automation f2bf8888-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088800:action:0:user:6', 0, NULL, '2026-08-30 09:26:23.014'),
(400, 1, 1, 7, 'automation', 'automations', 'info', 'Automation f2bf8888-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088800:action:0:user:7', 0, NULL, '2026-08-30 09:26:23.017'),
(401, 1, 1, 8, 'automation', 'automations', 'info', 'Automation f2bf8888-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088800:action:0:user:8', 0, NULL, '2026-08-30 09:26:23.026'),
(402, 1, 1, 9, 'automation', 'automations', 'info', 'Automation f2bf8888-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088800:action:0:user:9', 0, NULL, '2026-08-30 09:26:23.030'),
(403, 1, 1, 10, 'automation', 'automations', 'info', 'Automation f2bf8888-8', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088800:action:0:user:10', 0, NULL, '2026-08-30 09:26:23.033'),
(410, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 009c4f42-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 1, '2026-08-30 02:31:07.423', '2026-08-30 09:27:03.574'),
(411, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 009c4f42-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:27:03.582'),
(412, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 009c4f42-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:27:03.587'),
(413, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 009c4f42-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:27:03.591'),
(414, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 009c4f42-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:27:03.597'),
(415, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 009c4f42-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:27:03.601'),
(416, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 009c4f42-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:27:03.605'),
(417, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 009c4f42-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:27:03.608'),
(418, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 009c4f42-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 09:27:03.615'),
(421, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 009c4f42-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074110:policy:smoke-order-created:user:2', 1, '2026-08-30 02:31:07.423', '2026-08-30 09:27:03.637'),
(422, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 009c4f42-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074110:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 09:27:03.641'),
(423, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 009c4f42-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074110:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 09:27:03.648'),
(424, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 009c4f42-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074110:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 09:27:03.652'),
(425, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 009c4f42-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074110:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 09:27:03.656'),
(426, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 009c4f42-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074110:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 09:27:03.659'),
(427, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 009c4f42-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074110:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 09:27:03.668'),
(428, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 009c4f42-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074110:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 09:27:03.671'),
(429, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 009c4f42-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9074110:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 09:27:03.675'),
(441, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-009c4f42-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9074111:policy:craft-order-created:user:2', 1, '2026-08-30 02:30:37.673', '2026-08-30 09:27:03.754'),
(442, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-009c4f42-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9074111:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 09:27:03.758'),
(443, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-009c4f42-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9074111:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 09:27:03.764'),
(444, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-009c4f42-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9074111:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 09:27:03.768'),
(445, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-009c4f42-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9074111:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 09:27:03.772'),
(446, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-009c4f42-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9074111:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 09:27:03.779'),
(447, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-009c4f42-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9074111:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 09:27:03.790'),
(448, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-009c4f42-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9074111:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 09:27:03.798'),
(449, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-009c4f42-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9074111:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 09:27:03.802'),
(461, 1, 1, 2, 'automation', 'automations', 'info', 'Automation 009c4f42-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8036056:action:0:user:2', 1, '2026-08-30 02:30:35.973', '2026-08-30 09:27:03.871'),
(462, 1, 1, 3, 'automation', 'automations', 'info', 'Automation 009c4f42-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8036056:action:0:user:3', 0, NULL, '2026-08-30 09:27:03.874'),
(463, 1, 1, 4, 'automation', 'automations', 'info', 'Automation 009c4f42-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8036056:action:0:user:4', 0, NULL, '2026-08-30 09:27:03.880'),
(464, 1, 1, 5, 'automation', 'automations', 'info', 'Automation 009c4f42-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8036056:action:0:user:5', 0, NULL, '2026-08-30 09:27:03.884'),
(465, 1, 1, 6, 'automation', 'automations', 'info', 'Automation 009c4f42-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8036056:action:0:user:6', 0, NULL, '2026-08-30 09:27:03.887'),
(466, 1, 1, 7, 'automation', 'automations', 'info', 'Automation 009c4f42-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8036056:action:0:user:7', 0, NULL, '2026-08-30 09:27:03.892'),
(467, 1, 1, 8, 'automation', 'automations', 'info', 'Automation 009c4f42-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8036056:action:0:user:8', 0, NULL, '2026-08-30 09:27:03.898'),
(468, 1, 1, 9, 'automation', 'automations', 'info', 'Automation 009c4f42-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8036056:action:0:user:9', 0, NULL, '2026-08-30 09:27:03.903'),
(469, 1, 1, 10, 'automation', 'automations', 'info', 'Automation 009c4f42-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8036056:action:0:user:10', 0, NULL, '2026-08-30 09:27:03.913'),
(476, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 489ba8c6-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:00:33.796'),
(477, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 489ba8c6-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:00:33.802'),
(478, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 489ba8c6-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:00:33.806'),
(479, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 489ba8c6-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:00:33.810'),
(480, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 489ba8c6-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:00:33.820'),
(481, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 489ba8c6-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:00:33.825'),
(482, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 489ba8c6-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:00:33.829'),
(483, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 489ba8c6-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:00:33.836'),
(484, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 489ba8c6-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:00:33.840'),
(487, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 489ba8c6-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9041393:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 10:00:33.862'),
(488, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 489ba8c6-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9041393:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 10:00:33.868'),
(489, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 489ba8c6-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9041393:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 10:00:33.872'),
(490, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 489ba8c6-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9041393:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 10:00:33.876'),
(491, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 489ba8c6-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9041393:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 10:00:33.879'),
(492, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 489ba8c6-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9041393:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 10:00:33.887'),
(493, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 489ba8c6-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9041393:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 10:00:33.890'),
(494, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 489ba8c6-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9041393:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 10:00:33.894'),
(495, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 489ba8c6-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9041393:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 10:00:33.902'),
(507, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-489ba8c6-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9041394:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 10:00:33.978'),
(508, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-489ba8c6-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9041394:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 10:00:33.985'),
(509, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-489ba8c6-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9041394:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 10:00:33.989'),
(510, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-489ba8c6-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9041394:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 10:00:33.993'),
(511, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-489ba8c6-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9041394:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 10:00:33.996'),
(512, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-489ba8c6-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9041394:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 10:00:34.003'),
(513, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-489ba8c6-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9041394:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 10:00:34.009'),
(514, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-489ba8c6-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9041394:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 10:00:34.017'),
(515, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-489ba8c6-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9041394:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 10:00:34.021'),
(527, 1, 1, 2, 'automation', 'automations', 'info', 'Automation 489ba8c6-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8030178:action:0:user:2', 0, NULL, '2026-08-30 10:00:34.079'),
(528, 1, 1, 3, 'automation', 'automations', 'info', 'Automation 489ba8c6-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8030178:action:0:user:3', 0, NULL, '2026-08-30 10:00:34.086'),
(529, 1, 1, 4, 'automation', 'automations', 'info', 'Automation 489ba8c6-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8030178:action:0:user:4', 0, NULL, '2026-08-30 10:00:34.091'),
(530, 1, 1, 5, 'automation', 'automations', 'info', 'Automation 489ba8c6-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8030178:action:0:user:5', 0, NULL, '2026-08-30 10:00:34.094'),
(531, 1, 1, 6, 'automation', 'automations', 'info', 'Automation 489ba8c6-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8030178:action:0:user:6', 0, NULL, '2026-08-30 10:00:34.100'),
(532, 1, 1, 7, 'automation', 'automations', 'info', 'Automation 489ba8c6-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8030178:action:0:user:7', 0, NULL, '2026-08-30 10:00:34.104'),
(533, 1, 1, 8, 'automation', 'automations', 'info', 'Automation 489ba8c6-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8030178:action:0:user:8', 0, NULL, '2026-08-30 10:00:34.108'),
(534, 1, 1, 9, 'automation', 'automations', 'info', 'Automation 489ba8c6-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8030178:action:0:user:9', 0, NULL, '2026-08-30 10:00:34.111'),
(535, 1, 1, 10, 'automation', 'automations', 'info', 'Automation 489ba8c6-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8030178:action:0:user:10', 0, NULL, '2026-08-30 10:00:34.115'),
(544, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace cce283e2-0', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:20.526'),
(545, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace cce283e2-0', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:20.530'),
(546, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace cce283e2-0', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:20.533'),
(547, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace cce283e2-0', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:20.538'),
(548, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace cce283e2-0', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:20.541'),
(549, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace cce283e2-0', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:20.544'),
(550, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace cce283e2-0', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:20.547'),
(551, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace cce283e2-0', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:20.551'),
(552, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace cce283e2-0', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:20.556'),
(555, 1, 1, 2, 'system', 'craft_orders', 'info', 'System cce283e2-0', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9042246:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 10:04:20.573'),
(556, 1, 1, 3, 'system', 'craft_orders', 'info', 'System cce283e2-0', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9042246:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 10:04:20.576'),
(557, 1, 1, 4, 'system', 'craft_orders', 'info', 'System cce283e2-0', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9042246:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 10:04:20.579'),
(558, 1, 1, 5, 'system', 'craft_orders', 'info', 'System cce283e2-0', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9042246:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 10:04:20.582'),
(559, 1, 1, 6, 'system', 'craft_orders', 'info', 'System cce283e2-0', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9042246:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 10:04:20.585'),
(560, 1, 1, 7, 'system', 'craft_orders', 'info', 'System cce283e2-0', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9042246:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 10:04:20.591'),
(561, 1, 1, 8, 'system', 'craft_orders', 'info', 'System cce283e2-0', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9042246:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 10:04:20.594'),
(562, 1, 1, 9, 'system', 'craft_orders', 'info', 'System cce283e2-0', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9042246:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 10:04:20.596'),
(563, 1, 1, 10, 'system', 'craft_orders', 'info', 'System cce283e2-0', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9042246:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 10:04:20.599'),
(575, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-cce283e2-0', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9042247:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 10:04:20.648'),
(576, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-cce283e2-0', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9042247:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 10:04:20.655'),
(577, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-cce283e2-0', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9042247:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 10:04:20.658'),
(578, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-cce283e2-0', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9042247:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 10:04:20.661'),
(579, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-cce283e2-0', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9042247:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 10:04:20.664'),
(580, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-cce283e2-0', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9042247:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 10:04:20.667'),
(581, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-cce283e2-0', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9042247:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 10:04:20.673'),
(582, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-cce283e2-0', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9042247:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 10:04:20.676'),
(583, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-cce283e2-0', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9042247:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 10:04:20.680'),
(595, 1, 1, 2, 'automation', 'automations', 'info', 'Automation cce283e2-0', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8093937:action:0:user:2', 0, NULL, '2026-08-30 10:04:20.723'),
(596, 1, 1, 3, 'automation', 'automations', 'info', 'Automation cce283e2-0', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8093937:action:0:user:3', 0, NULL, '2026-08-30 10:04:20.726'),
(597, 1, 1, 4, 'automation', 'automations', 'info', 'Automation cce283e2-0', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8093937:action:0:user:4', 0, NULL, '2026-08-30 10:04:20.728'),
(598, 1, 1, 5, 'automation', 'automations', 'info', 'Automation cce283e2-0', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8093937:action:0:user:5', 0, NULL, '2026-08-30 10:04:20.731'),
(599, 1, 1, 6, 'automation', 'automations', 'info', 'Automation cce283e2-0', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8093937:action:0:user:6', 0, NULL, '2026-08-30 10:04:20.734'),
(600, 1, 1, 7, 'automation', 'automations', 'info', 'Automation cce283e2-0', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8093937:action:0:user:7', 0, NULL, '2026-08-30 10:04:20.738'),
(601, 1, 1, 8, 'automation', 'automations', 'info', 'Automation cce283e2-0', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8093937:action:0:user:8', 0, NULL, '2026-08-30 10:04:20.741'),
(602, 1, 1, 9, 'automation', 'automations', 'info', 'Automation cce283e2-0', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8093937:action:0:user:9', 0, NULL, '2026-08-30 10:04:20.744'),
(603, 1, 1, 10, 'automation', 'automations', 'info', 'Automation cce283e2-0', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8093937:action:0:user:10', 0, NULL, '2026-08-30 10:04:20.746'),
(607, 1, 1, 2, 'system', 'craft_orders', 'warning', 'Pesanan mendekati tenggat: SMOKE-SENSOR-cce283e2-0', 'Tenggat pesanan ini akan tiba dalam 24 jam (Sun Aug 30 2026 11:04:20 GMT+0700 (Western Indonesia Time)).', '/app/craft/orders', 'craft_order', 3, 'system:sensor:order.deadline_approaching:1:craft_order:3:2026-08-30:user:2', 0, NULL, '2026-08-30 10:04:20.779'),
(608, 1, 1, 3, 'system', 'craft_orders', 'warning', 'Pesanan mendekati tenggat: SMOKE-SENSOR-cce283e2-0', 'Tenggat pesanan ini akan tiba dalam 24 jam (Sun Aug 30 2026 11:04:20 GMT+0700 (Western Indonesia Time)).', '/app/craft/orders', 'craft_order', 3, 'system:sensor:order.deadline_approaching:1:craft_order:3:2026-08-30:user:3', 0, NULL, '2026-08-30 10:04:20.782'),
(609, 1, 1, 4, 'system', 'craft_orders', 'warning', 'Pesanan mendekati tenggat: SMOKE-SENSOR-cce283e2-0', 'Tenggat pesanan ini akan tiba dalam 24 jam (Sun Aug 30 2026 11:04:20 GMT+0700 (Western Indonesia Time)).', '/app/craft/orders', 'craft_order', 3, 'system:sensor:order.deadline_approaching:1:craft_order:3:2026-08-30:user:4', 0, NULL, '2026-08-30 10:04:20.785'),
(610, 1, 1, 5, 'system', 'craft_orders', 'warning', 'Pesanan mendekati tenggat: SMOKE-SENSOR-cce283e2-0', 'Tenggat pesanan ini akan tiba dalam 24 jam (Sun Aug 30 2026 11:04:20 GMT+0700 (Western Indonesia Time)).', '/app/craft/orders', 'craft_order', 3, 'system:sensor:order.deadline_approaching:1:craft_order:3:2026-08-30:user:5', 0, NULL, '2026-08-30 10:04:20.789'),
(611, 1, 1, 6, 'system', 'craft_orders', 'warning', 'Pesanan mendekati tenggat: SMOKE-SENSOR-cce283e2-0', 'Tenggat pesanan ini akan tiba dalam 24 jam (Sun Aug 30 2026 11:04:20 GMT+0700 (Western Indonesia Time)).', '/app/craft/orders', 'craft_order', 3, 'system:sensor:order.deadline_approaching:1:craft_order:3:2026-08-30:user:6', 0, NULL, '2026-08-30 10:04:20.795'),
(612, 1, 1, 7, 'system', 'craft_orders', 'warning', 'Pesanan mendekati tenggat: SMOKE-SENSOR-cce283e2-0', 'Tenggat pesanan ini akan tiba dalam 24 jam (Sun Aug 30 2026 11:04:20 GMT+0700 (Western Indonesia Time)).', '/app/craft/orders', 'craft_order', 3, 'system:sensor:order.deadline_approaching:1:craft_order:3:2026-08-30:user:7', 0, NULL, '2026-08-30 10:04:20.797'),
(613, 1, 1, 8, 'system', 'craft_orders', 'warning', 'Pesanan mendekati tenggat: SMOKE-SENSOR-cce283e2-0', 'Tenggat pesanan ini akan tiba dalam 24 jam (Sun Aug 30 2026 11:04:20 GMT+0700 (Western Indonesia Time)).', '/app/craft/orders', 'craft_order', 3, 'system:sensor:order.deadline_approaching:1:craft_order:3:2026-08-30:user:8', 0, NULL, '2026-08-30 10:04:20.801'),
(614, 1, 1, 9, 'system', 'craft_orders', 'warning', 'Pesanan mendekati tenggat: SMOKE-SENSOR-cce283e2-0', 'Tenggat pesanan ini akan tiba dalam 24 jam (Sun Aug 30 2026 11:04:20 GMT+0700 (Western Indonesia Time)).', '/app/craft/orders', 'craft_order', 3, 'system:sensor:order.deadline_approaching:1:craft_order:3:2026-08-30:user:9', 0, NULL, '2026-08-30 10:04:20.807'),
(615, 1, 1, 10, 'system', 'craft_orders', 'warning', 'Pesanan mendekati tenggat: SMOKE-SENSOR-cce283e2-0', 'Tenggat pesanan ini akan tiba dalam 24 jam (Sun Aug 30 2026 11:04:20 GMT+0700 (Western Indonesia Time)).', '/app/craft/orders', 'craft_order', 3, 'system:sensor:order.deadline_approaching:1:craft_order:3:2026-08-30:user:10', 0, NULL, '2026-08-30 10:04:20.810'),
(632, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 07eb1411-1', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:48.194'),
(633, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 07eb1411-1', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:48.197'),
(634, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 07eb1411-1', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:48.201'),
(635, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 07eb1411-1', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:48.205'),
(636, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 07eb1411-1', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:48.208'),
(637, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 07eb1411-1', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:48.211'),
(638, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 07eb1411-1', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:48.215'),
(639, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 07eb1411-1', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:48.218'),
(640, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 07eb1411-1', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:04:48.221'),
(643, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 07eb1411-1', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9032808:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 10:04:48.236'),
(644, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 07eb1411-1', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9032808:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 10:04:48.239'),
(645, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 07eb1411-1', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9032808:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 10:04:48.242'),
(646, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 07eb1411-1', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9032808:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 10:04:48.245'),
(647, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 07eb1411-1', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9032808:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 10:04:48.250'),
(648, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 07eb1411-1', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9032808:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 10:04:48.253'),
(649, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 07eb1411-1', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9032808:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 10:04:48.255'),
(650, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 07eb1411-1', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9032808:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 10:04:48.258'),
(651, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 07eb1411-1', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9032808:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 10:04:48.261'),
(663, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-07eb1411-1', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9032809:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 10:04:48.307'),
(664, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-07eb1411-1', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9032809:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 10:04:48.310'),
(665, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-07eb1411-1', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9032809:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 10:04:48.313'),
(666, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-07eb1411-1', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9032809:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 10:04:48.318'),
(667, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-07eb1411-1', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9032809:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 10:04:48.321'),
(668, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-07eb1411-1', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9032809:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 10:04:48.323'),
(669, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-07eb1411-1', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9032809:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 10:04:48.327'),
(670, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-07eb1411-1', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9032809:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 10:04:48.332'),
(671, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-07eb1411-1', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9032809:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 10:04:48.335'),
(683, 1, 1, 2, 'automation', 'automations', 'info', 'Automation 07eb1411-1', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8017297:action:0:user:2', 0, NULL, '2026-08-30 10:04:48.370'),
(684, 1, 1, 3, 'automation', 'automations', 'info', 'Automation 07eb1411-1', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8017297:action:0:user:3', 0, NULL, '2026-08-30 10:04:48.373'),
(685, 1, 1, 4, 'automation', 'automations', 'info', 'Automation 07eb1411-1', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8017297:action:0:user:4', 0, NULL, '2026-08-30 10:04:48.375'),
(686, 1, 1, 5, 'automation', 'automations', 'info', 'Automation 07eb1411-1', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8017297:action:0:user:5', 0, NULL, '2026-08-30 10:04:48.377'),
(687, 1, 1, 6, 'automation', 'automations', 'info', 'Automation 07eb1411-1', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8017297:action:0:user:6', 0, NULL, '2026-08-30 10:04:48.380'),
(688, 1, 1, 7, 'automation', 'automations', 'info', 'Automation 07eb1411-1', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8017297:action:0:user:7', 0, NULL, '2026-08-30 10:04:48.383'),
(689, 1, 1, 8, 'automation', 'automations', 'info', 'Automation 07eb1411-1', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8017297:action:0:user:8', 0, NULL, '2026-08-30 10:04:48.386'),
(690, 1, 1, 9, 'automation', 'automations', 'info', 'Automation 07eb1411-1', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8017297:action:0:user:9', 0, NULL, '2026-08-30 10:04:48.388'),
(691, 1, 1, 10, 'automation', 'automations', 'info', 'Automation 07eb1411-1', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8017297:action:0:user:10', 0, NULL, '2026-08-30 10:04:48.392'),
(722, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 98c916d2-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:04.661'),
(723, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 98c916d2-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:04.665'),
(724, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 98c916d2-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:04.668'),
(725, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 98c916d2-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:04.671'),
(726, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 98c916d2-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:04.675'),
(727, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 98c916d2-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:04.680'),
(728, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 98c916d2-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:04.683'),
(729, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 98c916d2-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:04.687'),
(730, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 98c916d2-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:04.690'),
(733, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 98c916d2-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9091098:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 10:05:04.704'),
(734, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 98c916d2-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9091098:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 10:05:04.708'),
(735, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 98c916d2-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9091098:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 10:05:04.713'),
(736, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 98c916d2-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9091098:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 10:05:04.716'),
(737, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 98c916d2-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9091098:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 10:05:04.719'),
(738, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 98c916d2-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9091098:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 10:05:04.722'),
(739, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 98c916d2-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9091098:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 10:05:04.725'),
(740, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 98c916d2-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9091098:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 10:05:04.729'),
(741, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 98c916d2-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9091098:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 10:05:04.732'),
(753, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-98c916d2-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9091099:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 10:05:04.776'),
(754, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-98c916d2-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9091099:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 10:05:04.780'),
(755, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-98c916d2-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9091099:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 10:05:04.783'),
(756, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-98c916d2-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9091099:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 10:05:04.786'),
(757, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-98c916d2-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9091099:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 10:05:04.788'),
(758, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-98c916d2-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9091099:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 10:05:04.796'),
(759, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-98c916d2-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9091099:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 10:05:04.799'),
(760, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-98c916d2-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9091099:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 10:05:04.802'),
(761, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-98c916d2-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9091099:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 10:05:04.805'),
(773, 1, 1, 2, 'automation', 'automations', 'info', 'Automation 98c916d2-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011800:action:0:user:2', 0, NULL, '2026-08-30 10:05:04.842'),
(774, 1, 1, 3, 'automation', 'automations', 'info', 'Automation 98c916d2-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011800:action:0:user:3', 0, NULL, '2026-08-30 10:05:04.846'),
(775, 1, 1, 4, 'automation', 'automations', 'info', 'Automation 98c916d2-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011800:action:0:user:4', 0, NULL, '2026-08-30 10:05:04.849'),
(776, 1, 1, 5, 'automation', 'automations', 'info', 'Automation 98c916d2-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011800:action:0:user:5', 0, NULL, '2026-08-30 10:05:04.855'),
(777, 1, 1, 6, 'automation', 'automations', 'info', 'Automation 98c916d2-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011800:action:0:user:6', 0, NULL, '2026-08-30 10:05:04.858'),
(778, 1, 1, 7, 'automation', 'automations', 'info', 'Automation 98c916d2-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011800:action:0:user:7', 0, NULL, '2026-08-30 10:05:04.863'),
(779, 1, 1, 8, 'automation', 'automations', 'info', 'Automation 98c916d2-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011800:action:0:user:8', 0, NULL, '2026-08-30 10:05:04.866'),
(780, 1, 1, 9, 'automation', 'automations', 'info', 'Automation 98c916d2-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011800:action:0:user:9', 0, NULL, '2026-08-30 10:05:04.870'),
(781, 1, 1, 10, 'automation', 'automations', 'info', 'Automation 98c916d2-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8011800:action:0:user:10', 0, NULL, '2026-08-30 10:05:04.873'),
(812, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace b230feb7-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:25.225'),
(813, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace b230feb7-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:25.230'),
(814, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace b230feb7-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:25.234'),
(815, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace b230feb7-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:25.238'),
(816, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace b230feb7-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:25.244'),
(817, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace b230feb7-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:25.248'),
(818, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace b230feb7-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:25.256'),
(819, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace b230feb7-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:25.261'),
(820, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace b230feb7-3', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:05:25.266'),
(823, 1, 1, 2, 'system', 'craft_orders', 'info', 'System b230feb7-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9016129:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 10:05:25.295'),
(824, 1, 1, 3, 'system', 'craft_orders', 'info', 'System b230feb7-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9016129:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 10:05:25.299'),
(825, 1, 1, 4, 'system', 'craft_orders', 'info', 'System b230feb7-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9016129:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 10:05:25.303'),
(826, 1, 1, 5, 'system', 'craft_orders', 'info', 'System b230feb7-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9016129:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 10:05:25.308'),
(827, 1, 1, 6, 'system', 'craft_orders', 'info', 'System b230feb7-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9016129:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 10:05:25.313'),
(828, 1, 1, 7, 'system', 'craft_orders', 'info', 'System b230feb7-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9016129:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 10:05:25.317'),
(829, 1, 1, 8, 'system', 'craft_orders', 'info', 'System b230feb7-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9016129:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 10:05:25.324');
INSERT INTO `notifications` (`id`, `organization_id`, `business_unit_id`, `user_id`, `notification_type`, `module_code`, `severity_code`, `title`, `message`, `action_url`, `entity_type`, `entity_id`, `dedupe_key`, `is_read`, `read_at`, `created_at`) VALUES
(830, 1, 1, 9, 'system', 'craft_orders', 'info', 'System b230feb7-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9016129:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 10:05:25.329'),
(831, 1, 1, 10, 'system', 'craft_orders', 'info', 'System b230feb7-3', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9016129:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 10:05:25.333'),
(843, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-b230feb7-3', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9016130:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 10:05:25.404'),
(844, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-b230feb7-3', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9016130:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 10:05:25.409'),
(845, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-b230feb7-3', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9016130:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 10:05:25.413'),
(846, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-b230feb7-3', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9016130:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 10:05:25.417'),
(847, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-b230feb7-3', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9016130:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 10:05:25.422'),
(848, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-b230feb7-3', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9016130:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 10:05:25.429'),
(849, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-b230feb7-3', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9016130:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 10:05:25.435'),
(850, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-b230feb7-3', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9016130:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 10:05:25.441'),
(851, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-b230feb7-3', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9016130:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 10:05:25.447'),
(863, 1, 1, 2, 'automation', 'automations', 'info', 'Automation b230feb7-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084463:action:0:user:2', 0, NULL, '2026-08-30 10:05:25.504'),
(864, 1, 1, 3, 'automation', 'automations', 'info', 'Automation b230feb7-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084463:action:0:user:3', 0, NULL, '2026-08-30 10:05:25.509'),
(865, 1, 1, 4, 'automation', 'automations', 'info', 'Automation b230feb7-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084463:action:0:user:4', 0, NULL, '2026-08-30 10:05:25.513'),
(866, 1, 1, 5, 'automation', 'automations', 'info', 'Automation b230feb7-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084463:action:0:user:5', 0, NULL, '2026-08-30 10:05:25.516'),
(867, 1, 1, 6, 'automation', 'automations', 'info', 'Automation b230feb7-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084463:action:0:user:6', 0, NULL, '2026-08-30 10:05:25.520'),
(868, 1, 1, 7, 'automation', 'automations', 'info', 'Automation b230feb7-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084463:action:0:user:7', 0, NULL, '2026-08-30 10:05:25.525'),
(869, 1, 1, 8, 'automation', 'automations', 'info', 'Automation b230feb7-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084463:action:0:user:8', 0, NULL, '2026-08-30 10:05:25.532'),
(870, 1, 1, 9, 'automation', 'automations', 'info', 'Automation b230feb7-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084463:action:0:user:9', 0, NULL, '2026-08-30 10:05:25.535'),
(871, 1, 1, 10, 'automation', 'automations', 'info', 'Automation b230feb7-3', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084463:action:0:user:10', 0, NULL, '2026-08-30 10:05:25.539'),
(905, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:298:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 10:13:34.480'),
(906, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:298:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 10:13:34.485'),
(907, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:298:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 10:13:34.488'),
(908, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:298:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 10:13:34.492'),
(909, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:298:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 10:13:34.498'),
(910, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:298:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 10:13:34.501'),
(911, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:298:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 10:13:34.504'),
(912, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:298:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 10:13:34.507'),
(913, 1, 2, 3, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:299:policy:studio-project-created:user:3', 0, NULL, '2026-08-30 10:13:42.003'),
(914, 1, 2, 4, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:299:policy:studio-project-created:user:4', 0, NULL, '2026-08-30 10:13:42.007'),
(915, 1, 2, 10, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:299:policy:studio-project-created:user:10', 0, NULL, '2026-08-30 10:13:42.012'),
(916, 1, 2, 8, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:299:policy:studio-project-created:user:8', 0, NULL, '2026-08-30 10:13:42.018'),
(917, 1, 2, 7, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:299:policy:studio-project-created:user:7', 0, NULL, '2026-08-30 10:13:42.021'),
(918, 1, 2, 6, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:299:policy:studio-project-created:user:6', 0, NULL, '2026-08-30 10:13:42.024'),
(919, 1, 2, 5, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:299:policy:studio-project-created:user:5', 0, NULL, '2026-08-30 10:13:42.030'),
(920, 1, 2, 9, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:299:policy:studio-project-created:user:9', 0, NULL, '2026-08-30 10:13:42.035'),
(921, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 7, NULL, 0, NULL, '2026-08-30 10:13:48.418'),
(922, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 7, NULL, 0, NULL, '2026-08-30 10:13:48.420'),
(923, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 7, NULL, 0, NULL, '2026-08-30 10:13:48.422'),
(924, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 8, NULL, 0, NULL, '2026-08-30 10:13:48.473'),
(925, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 8, NULL, 0, NULL, '2026-08-30 10:13:48.479'),
(926, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 8, NULL, 0, NULL, '2026-08-30 10:13:48.480'),
(927, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 7, NULL, 0, NULL, '2026-08-30 10:13:48.693'),
(928, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 7, NULL, 0, NULL, '2026-08-30 10:13:48.697'),
(929, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 7, NULL, 0, NULL, '2026-08-30 10:13:48.699'),
(930, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 8, NULL, 0, NULL, '2026-08-30 10:13:48.887'),
(931, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 8, NULL, 0, NULL, '2026-08-30 10:13:48.889'),
(932, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 8, NULL, 0, NULL, '2026-08-30 10:13:48.892'),
(940, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace e8adbb6f-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:15:22.842'),
(941, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace e8adbb6f-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:15:22.845'),
(942, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace e8adbb6f-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:15:22.848'),
(943, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace e8adbb6f-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:15:22.851'),
(944, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace e8adbb6f-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:15:22.854'),
(945, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace e8adbb6f-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:15:22.859'),
(946, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace e8adbb6f-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:15:22.862'),
(947, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace e8adbb6f-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:15:22.865'),
(948, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace e8adbb6f-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:15:22.869'),
(951, 1, 1, 2, 'system', 'craft_orders', 'info', 'System e8adbb6f-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9008499:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 10:15:22.886'),
(952, 1, 1, 3, 'system', 'craft_orders', 'info', 'System e8adbb6f-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9008499:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 10:15:22.895'),
(953, 1, 1, 4, 'system', 'craft_orders', 'info', 'System e8adbb6f-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9008499:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 10:15:22.898'),
(954, 1, 1, 5, 'system', 'craft_orders', 'info', 'System e8adbb6f-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9008499:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 10:15:22.901'),
(955, 1, 1, 6, 'system', 'craft_orders', 'info', 'System e8adbb6f-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9008499:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 10:15:22.904'),
(956, 1, 1, 7, 'system', 'craft_orders', 'info', 'System e8adbb6f-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9008499:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 10:15:22.908'),
(957, 1, 1, 8, 'system', 'craft_orders', 'info', 'System e8adbb6f-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9008499:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 10:15:22.911'),
(958, 1, 1, 9, 'system', 'craft_orders', 'info', 'System e8adbb6f-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9008499:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 10:15:22.914'),
(959, 1, 1, 10, 'system', 'craft_orders', 'info', 'System e8adbb6f-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9008499:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 10:15:22.917'),
(971, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-e8adbb6f-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9008500:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 10:15:22.965'),
(972, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-e8adbb6f-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9008500:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 10:15:22.969'),
(973, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-e8adbb6f-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9008500:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 10:15:22.974'),
(974, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-e8adbb6f-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9008500:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 10:15:22.976'),
(975, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-e8adbb6f-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9008500:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 10:15:22.979'),
(976, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-e8adbb6f-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9008500:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 10:15:22.983'),
(977, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-e8adbb6f-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9008500:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 10:15:22.986'),
(978, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-e8adbb6f-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9008500:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 10:15:22.990'),
(979, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-e8adbb6f-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9008500:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 10:15:22.994'),
(991, 1, 1, 2, 'automation', 'automations', 'info', 'Automation e8adbb6f-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8046008:action:0:user:2', 0, NULL, '2026-08-30 10:15:23.037'),
(992, 1, 1, 3, 'automation', 'automations', 'info', 'Automation e8adbb6f-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8046008:action:0:user:3', 0, NULL, '2026-08-30 10:15:23.041'),
(993, 1, 1, 4, 'automation', 'automations', 'info', 'Automation e8adbb6f-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8046008:action:0:user:4', 0, NULL, '2026-08-30 10:15:23.043'),
(994, 1, 1, 5, 'automation', 'automations', 'info', 'Automation e8adbb6f-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8046008:action:0:user:5', 0, NULL, '2026-08-30 10:15:23.046'),
(995, 1, 1, 6, 'automation', 'automations', 'info', 'Automation e8adbb6f-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8046008:action:0:user:6', 0, NULL, '2026-08-30 10:15:23.048'),
(996, 1, 1, 7, 'automation', 'automations', 'info', 'Automation e8adbb6f-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8046008:action:0:user:7', 0, NULL, '2026-08-30 10:15:23.051'),
(997, 1, 1, 8, 'automation', 'automations', 'info', 'Automation e8adbb6f-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8046008:action:0:user:8', 0, NULL, '2026-08-30 10:15:23.054'),
(998, 1, 1, 9, 'automation', 'automations', 'info', 'Automation e8adbb6f-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8046008:action:0:user:9', 0, NULL, '2026-08-30 10:15:23.057'),
(999, 1, 1, 10, 'automation', 'automations', 'info', 'Automation e8adbb6f-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8046008:action:0:user:10', 0, NULL, '2026-08-30 10:15:23.060'),
(1034, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 6ea4b087-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:19:31.785'),
(1035, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 6ea4b087-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:19:31.791'),
(1036, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 6ea4b087-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:19:31.796'),
(1037, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 6ea4b087-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:19:31.800'),
(1038, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 6ea4b087-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:19:31.804'),
(1039, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 6ea4b087-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:19:31.809'),
(1040, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 6ea4b087-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:19:31.813'),
(1041, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 6ea4b087-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:19:31.817'),
(1042, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 6ea4b087-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 10:19:31.820'),
(1045, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 6ea4b087-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9070872:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 10:19:31.839'),
(1046, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 6ea4b087-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9070872:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 10:19:31.845'),
(1047, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 6ea4b087-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9070872:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 10:19:31.849'),
(1048, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 6ea4b087-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9070872:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 10:19:31.853'),
(1049, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 6ea4b087-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9070872:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 10:19:31.858'),
(1050, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 6ea4b087-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9070872:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 10:19:31.861'),
(1051, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 6ea4b087-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9070872:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 10:19:31.865'),
(1052, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 6ea4b087-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9070872:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 10:19:31.869'),
(1053, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 6ea4b087-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9070872:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 10:19:31.874'),
(1065, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-6ea4b087-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9070873:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 10:19:31.935'),
(1066, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-6ea4b087-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9070873:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 10:19:31.938'),
(1067, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-6ea4b087-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9070873:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 10:19:31.943'),
(1068, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-6ea4b087-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9070873:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 10:19:31.947'),
(1069, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-6ea4b087-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9070873:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 10:19:31.951'),
(1070, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-6ea4b087-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9070873:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 10:19:31.955'),
(1071, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-6ea4b087-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9070873:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 10:19:31.961'),
(1072, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-6ea4b087-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9070873:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 10:19:31.965'),
(1073, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-6ea4b087-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9070873:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 10:19:31.969'),
(1085, 1, 1, 2, 'automation', 'automations', 'info', 'Automation 6ea4b087-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8063258:action:0:user:2', 0, NULL, '2026-08-30 10:19:32.022'),
(1086, 1, 1, 3, 'automation', 'automations', 'info', 'Automation 6ea4b087-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8063258:action:0:user:3', 0, NULL, '2026-08-30 10:19:32.027'),
(1087, 1, 1, 4, 'automation', 'automations', 'info', 'Automation 6ea4b087-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8063258:action:0:user:4', 0, NULL, '2026-08-30 10:19:32.030'),
(1088, 1, 1, 5, 'automation', 'automations', 'info', 'Automation 6ea4b087-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8063258:action:0:user:5', 0, NULL, '2026-08-30 10:19:32.033'),
(1089, 1, 1, 6, 'automation', 'automations', 'info', 'Automation 6ea4b087-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8063258:action:0:user:6', 0, NULL, '2026-08-30 10:19:32.036'),
(1090, 1, 1, 7, 'automation', 'automations', 'info', 'Automation 6ea4b087-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8063258:action:0:user:7', 0, NULL, '2026-08-30 10:19:32.041'),
(1091, 1, 1, 8, 'automation', 'automations', 'info', 'Automation 6ea4b087-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8063258:action:0:user:8', 0, NULL, '2026-08-30 10:19:32.046'),
(1092, 1, 1, 9, 'automation', 'automations', 'info', 'Automation 6ea4b087-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8063258:action:0:user:9', 0, NULL, '2026-08-30 10:19:32.049'),
(1093, 1, 1, 10, 'automation', 'automations', 'info', 'Automation 6ea4b087-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8063258:action:0:user:10', 0, NULL, '2026-08-30 10:19:32.052'),
(1126, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 11bf247f-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 05:59:23.046'),
(1127, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 11bf247f-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 05:59:23.051'),
(1128, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 11bf247f-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 05:59:23.055'),
(1129, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 11bf247f-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 05:59:23.059'),
(1130, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 11bf247f-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 05:59:23.063'),
(1131, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 11bf247f-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 05:59:23.069'),
(1132, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 11bf247f-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 05:59:23.074'),
(1133, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 11bf247f-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 05:59:23.078'),
(1134, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 11bf247f-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 05:59:23.082'),
(1137, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 11bf247f-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9075861:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 05:59:23.103'),
(1138, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 11bf247f-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9075861:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 05:59:23.107'),
(1139, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 11bf247f-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9075861:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 05:59:23.111'),
(1140, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 11bf247f-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9075861:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 05:59:23.118'),
(1141, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 11bf247f-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9075861:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 05:59:23.124'),
(1142, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 11bf247f-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9075861:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 05:59:23.127'),
(1143, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 11bf247f-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9075861:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 05:59:23.131'),
(1144, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 11bf247f-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9075861:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 05:59:23.137'),
(1145, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 11bf247f-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9075861:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 05:59:23.141'),
(1157, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-11bf247f-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9075862:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 05:59:23.212'),
(1158, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-11bf247f-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9075862:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 05:59:23.220'),
(1159, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-11bf247f-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9075862:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 05:59:23.224'),
(1160, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-11bf247f-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9075862:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 05:59:23.228'),
(1161, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-11bf247f-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9075862:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 05:59:23.234'),
(1162, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-11bf247f-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9075862:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 05:59:23.239'),
(1163, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-11bf247f-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9075862:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 05:59:23.245'),
(1164, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-11bf247f-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9075862:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 05:59:23.248'),
(1165, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-11bf247f-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9075862:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 05:59:23.253'),
(1177, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation 11bf247f-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084805:action:0:user:2', 0, NULL, '2026-08-30 05:59:23.348'),
(1178, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation 11bf247f-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084805:action:0:user:3', 0, NULL, '2026-08-30 05:59:23.355'),
(1179, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation 11bf247f-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084805:action:0:user:4', 0, NULL, '2026-08-30 05:59:23.359'),
(1180, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation 11bf247f-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084805:action:0:user:5', 0, NULL, '2026-08-30 05:59:23.367'),
(1181, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation 11bf247f-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084805:action:0:user:6', 0, NULL, '2026-08-30 05:59:23.376'),
(1182, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation 11bf247f-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084805:action:0:user:7', 0, NULL, '2026-08-30 05:59:23.392'),
(1183, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation 11bf247f-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084805:action:0:user:8', 0, NULL, '2026-08-30 05:59:23.396'),
(1184, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation 11bf247f-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084805:action:0:user:9', 0, NULL, '2026-08-30 05:59:23.402'),
(1185, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation 11bf247f-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8084805:action:0:user:10', 0, NULL, '2026-08-30 05:59:23.406'),
(1212, 1, 1, 2, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777001, 'system:sensor:printer.maintenance_due:1:printer:777001:2026-08-30:user:2', 0, NULL, '2026-08-30 05:59:23.575'),
(1213, 1, 1, 3, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777001, 'system:sensor:printer.maintenance_due:1:printer:777001:2026-08-30:user:3', 0, NULL, '2026-08-30 05:59:23.579'),
(1214, 1, 1, 4, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777001, 'system:sensor:printer.maintenance_due:1:printer:777001:2026-08-30:user:4', 0, NULL, '2026-08-30 05:59:23.583'),
(1215, 1, 1, 5, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777001, 'system:sensor:printer.maintenance_due:1:printer:777001:2026-08-30:user:5', 0, NULL, '2026-08-30 05:59:23.587'),
(1216, 1, 1, 6, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777001, 'system:sensor:printer.maintenance_due:1:printer:777001:2026-08-30:user:6', 0, NULL, '2026-08-30 05:59:23.590'),
(1217, 1, 1, 7, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777001, 'system:sensor:printer.maintenance_due:1:printer:777001:2026-08-30:user:7', 0, NULL, '2026-08-30 05:59:23.594'),
(1218, 1, 1, 8, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777001, 'system:sensor:printer.maintenance_due:1:printer:777001:2026-08-30:user:8', 0, NULL, '2026-08-30 05:59:23.598'),
(1219, 1, 1, 9, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777001, 'system:sensor:printer.maintenance_due:1:printer:777001:2026-08-30:user:9', 0, NULL, '2026-08-30 05:59:23.604'),
(1220, 1, 1, 10, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777001, 'system:sensor:printer.maintenance_due:1:printer:777001:2026-08-30:user:10', 0, NULL, '2026-08-30 05:59:23.608'),
(1223, 1, 1, 2, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer 2', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777002, 'system:sensor:printer.maintenance_due:1:printer:777002:2026-08-30:user:2', 0, NULL, '2026-08-30 05:59:23.624'),
(1224, 1, 1, 3, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer 2', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777002, 'system:sensor:printer.maintenance_due:1:printer:777002:2026-08-30:user:3', 0, NULL, '2026-08-30 05:59:23.628'),
(1225, 1, 1, 4, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer 2', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777002, 'system:sensor:printer.maintenance_due:1:printer:777002:2026-08-30:user:4', 0, NULL, '2026-08-30 05:59:23.631'),
(1226, 1, 1, 5, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer 2', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777002, 'system:sensor:printer.maintenance_due:1:printer:777002:2026-08-30:user:5', 0, NULL, '2026-08-30 05:59:23.636'),
(1227, 1, 1, 6, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer 2', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777002, 'system:sensor:printer.maintenance_due:1:printer:777002:2026-08-30:user:6', 0, NULL, '2026-08-30 05:59:23.640'),
(1228, 1, 1, 7, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer 2', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777002, 'system:sensor:printer.maintenance_due:1:printer:777002:2026-08-30:user:7', 0, NULL, '2026-08-30 05:59:23.644'),
(1229, 1, 1, 8, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer 2', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777002, 'system:sensor:printer.maintenance_due:1:printer:777002:2026-08-30:user:8', 0, NULL, '2026-08-30 05:59:23.648'),
(1230, 1, 1, 9, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer 2', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777002, 'system:sensor:printer.maintenance_due:1:printer:777002:2026-08-30:user:9', 0, NULL, '2026-08-30 05:59:23.653'),
(1231, 1, 1, 10, 'system', 'craft_printers', 'warning', 'Maintenance printer: Smoke printer 2', 'Jadwal maintenance printer telah jatuh tempo.', '/app/craft/printers/maintenance', 'printer', 777002, 'system:sensor:printer.maintenance_due:1:printer:777002:2026-08-30:user:10', 0, NULL, '2026-08-30 05:59:23.656'),
(1240, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 2de309c8-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 06:01:47.450'),
(1241, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 2de309c8-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 06:01:47.455'),
(1242, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 2de309c8-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 06:01:47.459'),
(1243, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 2de309c8-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 06:01:47.463'),
(1244, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 2de309c8-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 06:01:47.466'),
(1245, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 2de309c8-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 06:01:47.470'),
(1246, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 2de309c8-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 06:01:47.475'),
(1247, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 2de309c8-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 06:01:47.478'),
(1248, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 2de309c8-7', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 06:01:47.482'),
(1251, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 2de309c8-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9003432:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 06:01:47.500'),
(1252, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 2de309c8-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9003432:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 06:01:47.503'),
(1253, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 2de309c8-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9003432:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 06:01:47.508'),
(1254, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 2de309c8-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9003432:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 06:01:47.512'),
(1255, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 2de309c8-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9003432:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 06:01:47.516'),
(1256, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 2de309c8-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9003432:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 06:01:47.519'),
(1257, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 2de309c8-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9003432:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 06:01:47.529'),
(1258, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 2de309c8-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9003432:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 06:01:47.535'),
(1259, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 2de309c8-7', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9003432:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 06:01:47.547'),
(1271, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2de309c8-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9003433:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 06:01:47.611'),
(1272, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2de309c8-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9003433:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 06:01:47.615'),
(1273, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2de309c8-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9003433:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 06:01:47.618'),
(1274, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2de309c8-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9003433:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 06:01:47.623'),
(1275, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2de309c8-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9003433:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 06:01:47.627'),
(1276, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2de309c8-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9003433:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 06:01:47.631'),
(1277, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2de309c8-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9003433:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 06:01:47.635'),
(1278, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2de309c8-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9003433:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 06:01:47.641'),
(1279, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2de309c8-7', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9003433:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 06:01:47.645'),
(1291, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation 2de309c8-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8097793:action:0:user:2', 0, NULL, '2026-08-30 06:01:47.707'),
(1292, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation 2de309c8-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8097793:action:0:user:3', 0, NULL, '2026-08-30 06:01:47.981'),
(1293, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation 2de309c8-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8097793:action:0:user:4', 0, NULL, '2026-08-30 06:01:47.986'),
(1294, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation 2de309c8-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8097793:action:0:user:5', 0, NULL, '2026-08-30 06:01:47.991'),
(1295, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation 2de309c8-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8097793:action:0:user:6', 0, NULL, '2026-08-30 06:01:47.995'),
(1296, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation 2de309c8-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8097793:action:0:user:7', 0, NULL, '2026-08-30 06:01:47.999'),
(1297, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation 2de309c8-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8097793:action:0:user:8', 0, NULL, '2026-08-30 06:01:48.003'),
(1298, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation 2de309c8-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8097793:action:0:user:9', 0, NULL, '2026-08-30 06:01:48.007'),
(1299, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation 2de309c8-7', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8097793:action:0:user:10', 0, NULL, '2026-08-30 06:01:48.011'),
(1350, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:304:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 06:01:57.791'),
(1351, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:304:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 06:01:57.795'),
(1352, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:304:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 06:01:57.798');
INSERT INTO `notifications` (`id`, `organization_id`, `business_unit_id`, `user_id`, `notification_type`, `module_code`, `severity_code`, `title`, `message`, `action_url`, `entity_type`, `entity_id`, `dedupe_key`, `is_read`, `read_at`, `created_at`) VALUES
(1353, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:304:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 06:01:57.801'),
(1354, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:304:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 06:01:57.806'),
(1355, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:304:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 06:01:57.810'),
(1356, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:304:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 06:01:57.814'),
(1357, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:304:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 06:01:57.817'),
(1358, 1, 2, 3, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:305:policy:studio-project-created:user:3', 0, NULL, '2026-08-30 06:02:06.664'),
(1359, 1, 2, 4, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:305:policy:studio-project-created:user:4', 0, NULL, '2026-08-30 06:02:06.723'),
(1360, 1, 2, 10, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:305:policy:studio-project-created:user:10', 0, NULL, '2026-08-30 06:02:06.774'),
(1361, 1, 2, 8, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:305:policy:studio-project-created:user:8', 0, NULL, '2026-08-30 06:02:06.876'),
(1362, 1, 2, 7, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:305:policy:studio-project-created:user:7', 0, NULL, '2026-08-30 06:02:06.993'),
(1363, 1, 2, 6, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:305:policy:studio-project-created:user:6', 0, NULL, '2026-08-30 06:02:07.087'),
(1364, 1, 2, 5, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:305:policy:studio-project-created:user:5', 0, NULL, '2026-08-30 06:02:07.208'),
(1365, 1, 2, 9, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:305:policy:studio-project-created:user:9', 0, NULL, '2026-08-30 06:02:07.336'),
(1366, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 9, NULL, 0, NULL, '2026-08-30 06:02:19.287'),
(1367, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 9, NULL, 0, NULL, '2026-08-30 06:02:19.290'),
(1368, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 9, NULL, 0, NULL, '2026-08-30 06:02:19.291'),
(1369, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 10, NULL, 0, NULL, '2026-08-30 06:02:19.342'),
(1370, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 10, NULL, 0, NULL, '2026-08-30 06:02:19.344'),
(1371, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 10, NULL, 0, NULL, '2026-08-30 06:02:19.348'),
(1372, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 9, NULL, 0, NULL, '2026-08-30 06:02:19.567'),
(1373, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 9, NULL, 0, NULL, '2026-08-30 06:02:19.572'),
(1374, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 9, NULL, 0, NULL, '2026-08-30 06:02:19.575'),
(1375, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 10, NULL, 0, NULL, '2026-08-30 06:02:19.761'),
(1376, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 10, NULL, 0, NULL, '2026-08-30 06:02:19.763'),
(1377, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 10, NULL, 0, NULL, '2026-08-30 06:02:19.767'),
(1398, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 2969a6e6-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 07:02:34.524'),
(1399, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 2969a6e6-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 07:02:34.528'),
(1400, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 2969a6e6-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 07:02:34.532'),
(1401, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 2969a6e6-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 07:02:34.536'),
(1402, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 2969a6e6-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 07:02:34.540'),
(1403, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 2969a6e6-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 07:02:34.544'),
(1404, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 2969a6e6-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 07:02:34.547'),
(1405, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 2969a6e6-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 07:02:34.551'),
(1406, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 2969a6e6-5', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-30 07:02:34.555'),
(1409, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 2969a6e6-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068292:policy:smoke-order-created:user:2', 0, NULL, '2026-08-30 07:02:34.572'),
(1410, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 2969a6e6-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068292:policy:smoke-order-created:user:3', 0, NULL, '2026-08-30 07:02:34.575'),
(1411, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 2969a6e6-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068292:policy:smoke-order-created:user:4', 0, NULL, '2026-08-30 07:02:34.579'),
(1412, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 2969a6e6-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068292:policy:smoke-order-created:user:5', 0, NULL, '2026-08-30 07:02:34.583'),
(1413, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 2969a6e6-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068292:policy:smoke-order-created:user:6', 0, NULL, '2026-08-30 07:02:34.587'),
(1414, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 2969a6e6-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068292:policy:smoke-order-created:user:7', 0, NULL, '2026-08-30 07:02:34.593'),
(1415, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 2969a6e6-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068292:policy:smoke-order-created:user:8', 0, NULL, '2026-08-30 07:02:34.600'),
(1416, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 2969a6e6-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068292:policy:smoke-order-created:user:9', 0, NULL, '2026-08-30 07:02:34.606'),
(1417, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 2969a6e6-5', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068292:policy:smoke-order-created:user:10', 0, NULL, '2026-08-30 07:02:34.612'),
(1429, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2969a6e6-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9068293:policy:craft-order-created:user:2', 0, NULL, '2026-08-30 07:02:34.676'),
(1430, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2969a6e6-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9068293:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 07:02:34.680'),
(1431, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2969a6e6-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9068293:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 07:02:34.688'),
(1432, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2969a6e6-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9068293:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 07:02:34.695'),
(1433, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2969a6e6-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9068293:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 07:02:34.700'),
(1434, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2969a6e6-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9068293:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 07:02:34.704'),
(1435, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2969a6e6-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9068293:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 07:02:34.708'),
(1436, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2969a6e6-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9068293:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 07:02:34.712'),
(1437, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2969a6e6-5', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9068293:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 07:02:34.715'),
(1449, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation 2969a6e6-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8071231:action:0:user:2', 0, NULL, '2026-08-30 07:02:34.760'),
(1450, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation 2969a6e6-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8071231:action:0:user:3', 0, NULL, '2026-08-30 07:02:34.764'),
(1451, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation 2969a6e6-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8071231:action:0:user:4', 0, NULL, '2026-08-30 07:02:34.768'),
(1452, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation 2969a6e6-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8071231:action:0:user:5', 0, NULL, '2026-08-30 07:02:34.772'),
(1453, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation 2969a6e6-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8071231:action:0:user:6', 0, NULL, '2026-08-30 07:02:34.775'),
(1454, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation 2969a6e6-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8071231:action:0:user:7', 0, NULL, '2026-08-30 07:02:34.779'),
(1455, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation 2969a6e6-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8071231:action:0:user:8', 0, NULL, '2026-08-30 07:02:34.786'),
(1456, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation 2969a6e6-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8071231:action:0:user:9', 0, NULL, '2026-08-30 07:02:34.790'),
(1457, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation 2969a6e6-5', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8071231:action:0:user:10', 0, NULL, '2026-08-30 07:02:34.793'),
(1508, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 11, NULL, 0, NULL, '2026-08-30 07:02:42.140'),
(1509, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 11, NULL, 0, NULL, '2026-08-30 07:02:42.142'),
(1510, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 11, NULL, 0, NULL, '2026-08-30 07:02:42.144'),
(1511, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 12, NULL, 0, NULL, '2026-08-30 07:02:42.193'),
(1512, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 12, NULL, 0, NULL, '2026-08-30 07:02:42.195'),
(1513, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 12, NULL, 0, NULL, '2026-08-30 07:02:42.198'),
(1514, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 11, NULL, 0, NULL, '2026-08-30 07:02:42.414'),
(1515, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 11, NULL, 0, NULL, '2026-08-30 07:02:42.417'),
(1516, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 11, NULL, 0, NULL, '2026-08-30 07:02:42.420'),
(1517, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 12, NULL, 0, NULL, '2026-08-30 07:02:42.586'),
(1518, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 12, NULL, 0, NULL, '2026-08-30 07:02:42.589'),
(1519, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 12, NULL, 0, NULL, '2026-08-30 07:02:42.591'),
(1521, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:307:policy:craft-order-created:user:3', 0, NULL, '2026-08-30 07:03:09.632'),
(1522, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:307:policy:craft-order-created:user:4', 0, NULL, '2026-08-30 07:03:09.636'),
(1523, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:307:policy:craft-order-created:user:10', 0, NULL, '2026-08-30 07:03:09.640'),
(1524, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:307:policy:craft-order-created:user:8', 0, NULL, '2026-08-30 07:03:09.644'),
(1525, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:307:policy:craft-order-created:user:7', 0, NULL, '2026-08-30 07:03:09.648'),
(1526, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:307:policy:craft-order-created:user:6', 0, NULL, '2026-08-30 07:03:09.652'),
(1527, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:307:policy:craft-order-created:user:5', 0, NULL, '2026-08-30 07:03:09.655'),
(1528, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:307:policy:craft-order-created:user:9', 0, NULL, '2026-08-30 07:03:09.659'),
(1529, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 17, 'system:event:328:policy:studio-payment-received:user:2', 0, NULL, '2026-08-30 07:03:53.228'),
(1530, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 17, 'system:event:328:policy:studio-payment-received:user:3', 0, NULL, '2026-08-30 07:03:53.233'),
(1531, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 17, 'system:event:328:policy:studio-payment-received:user:4', 0, NULL, '2026-08-30 07:03:53.236'),
(1532, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 17, 'system:event:328:policy:studio-payment-received:user:5', 0, NULL, '2026-08-30 07:03:53.241'),
(1533, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 17, 'system:event:328:policy:studio-payment-received:user:6', 0, NULL, '2026-08-30 07:03:53.245'),
(1534, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 17, 'system:event:328:policy:studio-payment-received:user:7', 0, NULL, '2026-08-30 07:03:53.249'),
(1535, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 17, 'system:event:328:policy:studio-payment-received:user:8', 0, NULL, '2026-08-30 07:03:53.252'),
(1536, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 17, 'system:event:328:policy:studio-payment-received:user:9', 0, NULL, '2026-08-30 07:03:53.256'),
(1537, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 17, 'system:event:328:policy:studio-payment-received:user:10', 0, NULL, '2026-08-30 07:03:53.260'),
(1538, 1, 2, 3, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:329:policy:studio-project-created:user:3', 0, NULL, '2026-08-30 07:04:00.918'),
(1539, 1, 2, 4, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:329:policy:studio-project-created:user:4', 0, NULL, '2026-08-30 07:04:00.922'),
(1540, 1, 2, 10, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:329:policy:studio-project-created:user:10', 0, NULL, '2026-08-30 07:04:00.927'),
(1541, 1, 2, 8, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:329:policy:studio-project-created:user:8', 0, NULL, '2026-08-30 07:04:00.930'),
(1542, 1, 2, 7, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:329:policy:studio-project-created:user:7', 0, NULL, '2026-08-30 07:04:00.934'),
(1543, 1, 2, 6, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:329:policy:studio-project-created:user:6', 0, NULL, '2026-08-30 07:04:00.939'),
(1544, 1, 2, 5, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:329:policy:studio-project-created:user:5', 0, NULL, '2026-08-30 07:04:00.943'),
(1545, 1, 2, 9, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:329:policy:studio-project-created:user:9', 0, NULL, '2026-08-30 07:04:00.947'),
(1550, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 1eeed86d-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 02:22:04.819'),
(1551, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 1eeed86d-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 02:22:04.824'),
(1552, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 1eeed86d-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 02:22:04.828'),
(1553, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 1eeed86d-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 02:22:04.832'),
(1554, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 1eeed86d-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 02:22:04.836'),
(1555, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 1eeed86d-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 02:22:04.870'),
(1556, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 1eeed86d-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 02:22:04.876'),
(1557, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 1eeed86d-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 02:22:04.880'),
(1558, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 1eeed86d-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 02:22:04.884'),
(1561, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 1eeed86d-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055552:policy:smoke-order-created:user:2', 0, NULL, '2026-08-31 02:22:04.904'),
(1562, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 1eeed86d-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055552:policy:smoke-order-created:user:3', 0, NULL, '2026-08-31 02:22:04.909'),
(1563, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 1eeed86d-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055552:policy:smoke-order-created:user:4', 0, NULL, '2026-08-31 02:22:04.913'),
(1564, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 1eeed86d-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055552:policy:smoke-order-created:user:5', 0, NULL, '2026-08-31 02:22:04.917'),
(1565, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 1eeed86d-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055552:policy:smoke-order-created:user:6', 0, NULL, '2026-08-31 02:22:04.921'),
(1566, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 1eeed86d-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055552:policy:smoke-order-created:user:7', 0, NULL, '2026-08-31 02:22:04.930'),
(1567, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 1eeed86d-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055552:policy:smoke-order-created:user:8', 0, NULL, '2026-08-31 02:22:04.935'),
(1568, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 1eeed86d-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055552:policy:smoke-order-created:user:9', 0, NULL, '2026-08-31 02:22:04.941'),
(1569, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 1eeed86d-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9055552:policy:smoke-order-created:user:10', 0, NULL, '2026-08-31 02:22:04.945'),
(1581, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-1eeed86d-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9055553:policy:craft-order-created:user:2', 0, NULL, '2026-08-31 02:22:05.009'),
(1582, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-1eeed86d-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9055553:policy:craft-order-created:user:3', 0, NULL, '2026-08-31 02:22:05.013'),
(1583, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-1eeed86d-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9055553:policy:craft-order-created:user:4', 0, NULL, '2026-08-31 02:22:05.020'),
(1584, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-1eeed86d-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9055553:policy:craft-order-created:user:5', 0, NULL, '2026-08-31 02:22:05.025'),
(1585, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-1eeed86d-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9055553:policy:craft-order-created:user:6', 0, NULL, '2026-08-31 02:22:05.031'),
(1586, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-1eeed86d-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9055553:policy:craft-order-created:user:7', 0, NULL, '2026-08-31 02:22:05.037'),
(1587, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-1eeed86d-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9055553:policy:craft-order-created:user:8', 0, NULL, '2026-08-31 02:22:05.043'),
(1588, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-1eeed86d-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9055553:policy:craft-order-created:user:9', 0, NULL, '2026-08-31 02:22:05.048'),
(1589, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-1eeed86d-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9055553:policy:craft-order-created:user:10', 0, NULL, '2026-08-31 02:22:05.065'),
(1601, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation 1eeed86d-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8047585:action:0:user:2', 0, NULL, '2026-08-31 02:22:05.129'),
(1602, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation 1eeed86d-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8047585:action:0:user:3', 0, NULL, '2026-08-31 02:22:05.132'),
(1603, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation 1eeed86d-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8047585:action:0:user:4', 0, NULL, '2026-08-31 02:22:05.136'),
(1604, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation 1eeed86d-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8047585:action:0:user:5', 0, NULL, '2026-08-31 02:22:05.141'),
(1605, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation 1eeed86d-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8047585:action:0:user:6', 0, NULL, '2026-08-31 02:22:05.145'),
(1606, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation 1eeed86d-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8047585:action:0:user:7', 0, NULL, '2026-08-31 02:22:05.148'),
(1607, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation 1eeed86d-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8047585:action:0:user:8', 0, NULL, '2026-08-31 02:22:05.151'),
(1608, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation 1eeed86d-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8047585:action:0:user:9', 0, NULL, '2026-08-31 02:22:05.153'),
(1609, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation 1eeed86d-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8047585:action:0:user:10', 0, NULL, '2026-08-31 02:22:05.158'),
(1660, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 18, 'system:event:333:policy:studio-payment-received:user:2', 0, NULL, '2026-08-31 02:23:48.451'),
(1661, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 18, 'system:event:333:policy:studio-payment-received:user:3', 0, NULL, '2026-08-31 02:23:48.457'),
(1662, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 18, 'system:event:333:policy:studio-payment-received:user:4', 0, NULL, '2026-08-31 02:23:48.462'),
(1663, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 18, 'system:event:333:policy:studio-payment-received:user:5', 0, NULL, '2026-08-31 02:23:48.466'),
(1664, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 18, 'system:event:333:policy:studio-payment-received:user:6', 0, NULL, '2026-08-31 02:23:48.472'),
(1665, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 18, 'system:event:333:policy:studio-payment-received:user:7', 0, NULL, '2026-08-31 02:23:48.476'),
(1666, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 18, 'system:event:333:policy:studio-payment-received:user:8', 0, NULL, '2026-08-31 02:23:48.480'),
(1667, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 18, 'system:event:333:policy:studio-payment-received:user:9', 0, NULL, '2026-08-31 02:23:48.485'),
(1668, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 18, 'system:event:333:policy:studio-payment-received:user:10', 0, NULL, '2026-08-31 02:23:48.490'),
(1669, 1, 2, 2, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000038', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 38, 'system:event:338:policy:studio-quotation-accepted:user:2', 0, NULL, '2026-08-31 02:24:14.962'),
(1670, 1, 2, 3, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000038', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 38, 'system:event:338:policy:studio-quotation-accepted:user:3', 0, NULL, '2026-08-31 02:24:14.972'),
(1671, 1, 2, 4, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000038', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 38, 'system:event:338:policy:studio-quotation-accepted:user:4', 0, NULL, '2026-08-31 02:24:14.975'),
(1672, 1, 2, 2, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000040', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 40, 'system:event:352:policy:studio-quotation-accepted:user:2', 0, NULL, '2026-08-31 02:36:44.125'),
(1673, 1, 2, 3, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000040', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 40, 'system:event:352:policy:studio-quotation-accepted:user:3', 0, NULL, '2026-08-31 02:36:44.129'),
(1674, 1, 2, 4, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000040', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 40, 'system:event:352:policy:studio-quotation-accepted:user:4', 0, NULL, '2026-08-31 02:36:44.135'),
(1707, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 21, 'system:event:363:policy:studio-payment-received:user:2', 0, NULL, '2026-08-31 05:43:22.464'),
(1708, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 21, 'system:event:363:policy:studio-payment-received:user:3', 0, NULL, '2026-08-31 05:43:22.469'),
(1709, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 21, 'system:event:363:policy:studio-payment-received:user:4', 0, NULL, '2026-08-31 05:43:22.473'),
(1710, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 21, 'system:event:363:policy:studio-payment-received:user:5', 0, NULL, '2026-08-31 05:43:22.477'),
(1711, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 21, 'system:event:363:policy:studio-payment-received:user:6', 0, NULL, '2026-08-31 05:43:22.482'),
(1712, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 21, 'system:event:363:policy:studio-payment-received:user:7', 0, NULL, '2026-08-31 05:43:22.485'),
(1713, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 21, 'system:event:363:policy:studio-payment-received:user:8', 0, NULL, '2026-08-31 05:43:22.489'),
(1714, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 21, 'system:event:363:policy:studio-payment-received:user:9', 0, NULL, '2026-08-31 05:43:22.492'),
(1715, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 21, 'system:event:363:policy:studio-payment-received:user:10', 0, NULL, '2026-08-31 05:43:22.496'),
(1720, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 45baa829-e', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 05:51:16.480'),
(1721, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 45baa829-e', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 05:51:16.489'),
(1722, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 45baa829-e', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 05:51:16.493'),
(1723, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 45baa829-e', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 05:51:16.498'),
(1724, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 45baa829-e', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 05:51:16.506'),
(1725, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 45baa829-e', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 05:51:16.510'),
(1726, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 45baa829-e', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 05:51:16.515'),
(1727, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 45baa829-e', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 05:51:16.521'),
(1728, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 45baa829-e', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 05:51:16.526'),
(1731, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 45baa829-e', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9040274:policy:smoke-order-created:user:2', 0, NULL, '2026-08-31 05:51:16.553'),
(1732, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 45baa829-e', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9040274:policy:smoke-order-created:user:3', 0, NULL, '2026-08-31 05:51:16.558'),
(1733, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 45baa829-e', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9040274:policy:smoke-order-created:user:4', 0, NULL, '2026-08-31 05:51:16.562'),
(1734, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 45baa829-e', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9040274:policy:smoke-order-created:user:5', 0, NULL, '2026-08-31 05:51:16.566'),
(1735, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 45baa829-e', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9040274:policy:smoke-order-created:user:6', 0, NULL, '2026-08-31 05:51:16.570'),
(1736, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 45baa829-e', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9040274:policy:smoke-order-created:user:7', 0, NULL, '2026-08-31 05:51:16.574'),
(1737, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 45baa829-e', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9040274:policy:smoke-order-created:user:8', 0, NULL, '2026-08-31 05:51:16.578'),
(1738, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 45baa829-e', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9040274:policy:smoke-order-created:user:9', 0, NULL, '2026-08-31 05:51:16.583'),
(1739, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 45baa829-e', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9040274:policy:smoke-order-created:user:10', 0, NULL, '2026-08-31 05:51:16.588'),
(1751, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-45baa829-e', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9040275:policy:craft-order-created:user:2', 0, NULL, '2026-08-31 05:51:16.671'),
(1752, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-45baa829-e', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9040275:policy:craft-order-created:user:3', 0, NULL, '2026-08-31 05:51:16.675'),
(1753, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-45baa829-e', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9040275:policy:craft-order-created:user:4', 0, NULL, '2026-08-31 05:51:16.679'),
(1754, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-45baa829-e', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9040275:policy:craft-order-created:user:5', 0, NULL, '2026-08-31 05:51:16.684'),
(1755, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-45baa829-e', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9040275:policy:craft-order-created:user:6', 0, NULL, '2026-08-31 05:51:16.689'),
(1756, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-45baa829-e', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9040275:policy:craft-order-created:user:7', 0, NULL, '2026-08-31 05:51:16.694'),
(1757, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-45baa829-e', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9040275:policy:craft-order-created:user:8', 0, NULL, '2026-08-31 05:51:16.700'),
(1758, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-45baa829-e', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9040275:policy:craft-order-created:user:9', 0, NULL, '2026-08-31 05:51:16.704'),
(1759, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-45baa829-e', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9040275:policy:craft-order-created:user:10', 0, NULL, '2026-08-31 05:51:16.708'),
(1771, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation 45baa829-e', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8064655:action:0:user:2', 0, NULL, '2026-08-31 05:51:16.761'),
(1772, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation 45baa829-e', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8064655:action:0:user:3', 0, NULL, '2026-08-31 05:51:16.765'),
(1773, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation 45baa829-e', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8064655:action:0:user:4', 0, NULL, '2026-08-31 05:51:16.769'),
(1774, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation 45baa829-e', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8064655:action:0:user:5', 0, NULL, '2026-08-31 05:51:16.773'),
(1775, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation 45baa829-e', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8064655:action:0:user:6', 0, NULL, '2026-08-31 05:51:16.776'),
(1776, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation 45baa829-e', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8064655:action:0:user:7', 0, NULL, '2026-08-31 05:51:16.781'),
(1777, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation 45baa829-e', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8064655:action:0:user:8', 0, NULL, '2026-08-31 05:51:16.784'),
(1778, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation 45baa829-e', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8064655:action:0:user:9', 0, NULL, '2026-08-31 05:51:16.790'),
(1779, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation 45baa829-e', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8064655:action:0:user:10', 0, NULL, '2026-08-31 05:51:16.797'),
(1836, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 23, 'system:event:390:policy:studio-payment-received:user:2', 0, NULL, '2026-08-31 05:54:08.072'),
(1837, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 23, 'system:event:390:policy:studio-payment-received:user:3', 0, NULL, '2026-08-31 05:54:08.077'),
(1838, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 23, 'system:event:390:policy:studio-payment-received:user:4', 0, NULL, '2026-08-31 05:54:08.081'),
(1839, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 23, 'system:event:390:policy:studio-payment-received:user:5', 0, NULL, '2026-08-31 05:54:08.085'),
(1840, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 23, 'system:event:390:policy:studio-payment-received:user:6', 0, NULL, '2026-08-31 05:54:08.089'),
(1841, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 23, 'system:event:390:policy:studio-payment-received:user:7', 0, NULL, '2026-08-31 05:54:08.092'),
(1842, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 23, 'system:event:390:policy:studio-payment-received:user:8', 0, NULL, '2026-08-31 05:54:08.095'),
(1843, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 23, 'system:event:390:policy:studio-payment-received:user:9', 0, NULL, '2026-08-31 05:54:08.104'),
(1844, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 23, 'system:event:390:policy:studio-payment-received:user:10', 0, NULL, '2026-08-31 05:54:08.108'),
(1845, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 24, 'system:event:392:policy:studio-payment-received:user:2', 0, NULL, '2026-08-31 05:54:46.862'),
(1846, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 24, 'system:event:392:policy:studio-payment-received:user:3', 0, NULL, '2026-08-31 05:54:46.866'),
(1847, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 24, 'system:event:392:policy:studio-payment-received:user:4', 0, NULL, '2026-08-31 05:54:46.869'),
(1848, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 24, 'system:event:392:policy:studio-payment-received:user:5', 0, NULL, '2026-08-31 05:54:46.874'),
(1849, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 24, 'system:event:392:policy:studio-payment-received:user:6', 0, NULL, '2026-08-31 05:54:46.882');
INSERT INTO `notifications` (`id`, `organization_id`, `business_unit_id`, `user_id`, `notification_type`, `module_code`, `severity_code`, `title`, `message`, `action_url`, `entity_type`, `entity_id`, `dedupe_key`, `is_read`, `read_at`, `created_at`) VALUES
(1850, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 24, 'system:event:392:policy:studio-payment-received:user:7', 0, NULL, '2026-08-31 05:54:46.886'),
(1851, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 24, 'system:event:392:policy:studio-payment-received:user:8', 0, NULL, '2026-08-31 05:54:46.892'),
(1852, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 24, 'system:event:392:policy:studio-payment-received:user:9', 0, NULL, '2026-08-31 05:54:46.896'),
(1853, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 24, 'system:event:392:policy:studio-payment-received:user:10', 0, NULL, '2026-08-31 05:54:46.899'),
(1854, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 29, 'system:event:394:policy:studio-payment-received:user:2', 0, NULL, '2026-08-31 06:06:35.425'),
(1855, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 29, 'system:event:394:policy:studio-payment-received:user:3', 0, NULL, '2026-08-31 06:06:35.430'),
(1856, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 29, 'system:event:394:policy:studio-payment-received:user:4', 0, NULL, '2026-08-31 06:06:35.435'),
(1857, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 29, 'system:event:394:policy:studio-payment-received:user:5', 0, NULL, '2026-08-31 06:06:35.439'),
(1858, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 29, 'system:event:394:policy:studio-payment-received:user:6', 0, NULL, '2026-08-31 06:06:35.445'),
(1859, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 29, 'system:event:394:policy:studio-payment-received:user:7', 0, NULL, '2026-08-31 06:06:35.463'),
(1860, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 29, 'system:event:394:policy:studio-payment-received:user:8', 0, NULL, '2026-08-31 06:06:35.468'),
(1861, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 29, 'system:event:394:policy:studio-payment-received:user:9', 0, NULL, '2026-08-31 06:06:35.472'),
(1862, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 29, 'system:event:394:policy:studio-payment-received:user:10', 0, NULL, '2026-08-31 06:06:35.478'),
(1863, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 30, 'system:event:396:policy:studio-payment-received:user:2', 0, NULL, '2026-08-31 06:07:30.710'),
(1864, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 30, 'system:event:396:policy:studio-payment-received:user:3', 0, NULL, '2026-08-31 06:07:30.714'),
(1865, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 30, 'system:event:396:policy:studio-payment-received:user:4', 0, NULL, '2026-08-31 06:07:30.717'),
(1866, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 30, 'system:event:396:policy:studio-payment-received:user:5', 0, NULL, '2026-08-31 06:07:30.721'),
(1867, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 30, 'system:event:396:policy:studio-payment-received:user:6', 0, NULL, '2026-08-31 06:07:30.725'),
(1868, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 30, 'system:event:396:policy:studio-payment-received:user:7', 0, NULL, '2026-08-31 06:07:30.744'),
(1869, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 30, 'system:event:396:policy:studio-payment-received:user:8', 0, NULL, '2026-08-31 06:07:30.755'),
(1870, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 30, 'system:event:396:policy:studio-payment-received:user:9', 0, NULL, '2026-08-31 06:07:30.764'),
(1871, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 30, 'system:event:396:policy:studio-payment-received:user:10', 0, NULL, '2026-08-31 06:07:30.775'),
(1872, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 35, 'system:event:398:policy:studio-payment-received:user:2', 0, NULL, '2026-08-31 06:18:35.849'),
(1873, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 35, 'system:event:398:policy:studio-payment-received:user:3', 0, NULL, '2026-08-31 06:18:35.879'),
(1874, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 35, 'system:event:398:policy:studio-payment-received:user:4', 0, NULL, '2026-08-31 06:18:35.930'),
(1875, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 35, 'system:event:398:policy:studio-payment-received:user:5', 0, NULL, '2026-08-31 06:18:35.953'),
(1876, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 35, 'system:event:398:policy:studio-payment-received:user:6', 0, NULL, '2026-08-31 06:18:35.997'),
(1877, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 35, 'system:event:398:policy:studio-payment-received:user:7', 0, NULL, '2026-08-31 06:18:36.003'),
(1878, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 35, 'system:event:398:policy:studio-payment-received:user:8', 0, NULL, '2026-08-31 06:18:36.009'),
(1879, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 35, 'system:event:398:policy:studio-payment-received:user:9', 0, NULL, '2026-08-31 06:18:36.017'),
(1880, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 35, 'system:event:398:policy:studio-payment-received:user:10', 0, NULL, '2026-08-31 06:18:36.022'),
(1881, 1, 2, 2, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000045', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 45, 'system:event:403:policy:studio-quotation-accepted:user:2', 0, NULL, '2026-08-31 06:18:54.528'),
(1882, 1, 2, 3, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000045', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 45, 'system:event:403:policy:studio-quotation-accepted:user:3', 0, NULL, '2026-08-31 06:18:54.625'),
(1883, 1, 2, 4, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000045', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 45, 'system:event:403:policy:studio-quotation-accepted:user:4', 0, NULL, '2026-08-31 06:18:54.793'),
(1888, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 5688f533-c', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 06:19:03.749'),
(1889, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 5688f533-c', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 06:19:03.807'),
(1890, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 5688f533-c', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 06:19:03.882'),
(1891, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 5688f533-c', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 06:19:03.970'),
(1892, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 5688f533-c', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 06:19:04.075'),
(1893, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 5688f533-c', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 06:19:04.179'),
(1894, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 5688f533-c', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 06:19:04.382'),
(1895, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 5688f533-c', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 06:19:04.847'),
(1896, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 5688f533-c', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 06:19:04.884'),
(1899, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 5688f533-c', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9045781:policy:smoke-order-created:user:2', 0, NULL, '2026-08-31 06:19:04.949'),
(1900, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 5688f533-c', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9045781:policy:smoke-order-created:user:3', 0, NULL, '2026-08-31 06:19:04.960'),
(1901, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 5688f533-c', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9045781:policy:smoke-order-created:user:4', 0, NULL, '2026-08-31 06:19:04.966'),
(1902, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 5688f533-c', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9045781:policy:smoke-order-created:user:5', 0, NULL, '2026-08-31 06:19:04.970'),
(1903, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 5688f533-c', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9045781:policy:smoke-order-created:user:6', 0, NULL, '2026-08-31 06:19:04.974'),
(1904, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 5688f533-c', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9045781:policy:smoke-order-created:user:7', 0, NULL, '2026-08-31 06:19:04.978'),
(1905, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 5688f533-c', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9045781:policy:smoke-order-created:user:8', 0, NULL, '2026-08-31 06:19:04.982'),
(1906, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 5688f533-c', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9045781:policy:smoke-order-created:user:9', 0, NULL, '2026-08-31 06:19:04.985'),
(1907, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 5688f533-c', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9045781:policy:smoke-order-created:user:10', 0, NULL, '2026-08-31 06:19:04.992'),
(1919, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-5688f533-c', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9045782:policy:craft-order-created:user:2', 0, NULL, '2026-08-31 06:19:05.124'),
(1920, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-5688f533-c', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9045782:policy:craft-order-created:user:3', 0, NULL, '2026-08-31 06:19:05.147'),
(1921, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-5688f533-c', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9045782:policy:craft-order-created:user:4', 0, NULL, '2026-08-31 06:19:05.151'),
(1922, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-5688f533-c', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9045782:policy:craft-order-created:user:5', 0, NULL, '2026-08-31 06:19:05.156'),
(1923, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-5688f533-c', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9045782:policy:craft-order-created:user:6', 0, NULL, '2026-08-31 06:19:05.160'),
(1924, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-5688f533-c', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9045782:policy:craft-order-created:user:7', 0, NULL, '2026-08-31 06:19:05.164'),
(1925, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-5688f533-c', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9045782:policy:craft-order-created:user:8', 0, NULL, '2026-08-31 06:19:05.169'),
(1926, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-5688f533-c', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9045782:policy:craft-order-created:user:9', 0, NULL, '2026-08-31 06:19:05.174'),
(1927, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-5688f533-c', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9045782:policy:craft-order-created:user:10', 0, NULL, '2026-08-31 06:19:05.178'),
(1939, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation 5688f533-c', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8092248:action:0:user:2', 0, NULL, '2026-08-31 06:19:05.283'),
(1940, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation 5688f533-c', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8092248:action:0:user:3', 0, NULL, '2026-08-31 06:19:05.287'),
(1941, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation 5688f533-c', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8092248:action:0:user:4', 0, NULL, '2026-08-31 06:19:05.291'),
(1942, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation 5688f533-c', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8092248:action:0:user:5', 0, NULL, '2026-08-31 06:19:05.294'),
(1943, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation 5688f533-c', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8092248:action:0:user:6', 0, NULL, '2026-08-31 06:19:05.298'),
(1944, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation 5688f533-c', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8092248:action:0:user:7', 0, NULL, '2026-08-31 06:19:05.302'),
(1945, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation 5688f533-c', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8092248:action:0:user:8', 0, NULL, '2026-08-31 06:19:05.306'),
(1946, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation 5688f533-c', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8092248:action:0:user:9', 0, NULL, '2026-08-31 06:19:05.310'),
(1947, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation 5688f533-c', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8092248:action:0:user:10', 0, NULL, '2026-08-31 06:19:05.314'),
(2004, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 37, 'system:event:433:policy:studio-payment-received:user:2', 0, NULL, '2026-08-31 08:46:54.612'),
(2005, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 37, 'system:event:433:policy:studio-payment-received:user:3', 0, NULL, '2026-08-31 08:46:54.617'),
(2006, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 37, 'system:event:433:policy:studio-payment-received:user:4', 0, NULL, '2026-08-31 08:46:54.622'),
(2007, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 37, 'system:event:433:policy:studio-payment-received:user:5', 0, NULL, '2026-08-31 08:46:54.628'),
(2008, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 37, 'system:event:433:policy:studio-payment-received:user:6', 0, NULL, '2026-08-31 08:46:54.633'),
(2009, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 37, 'system:event:433:policy:studio-payment-received:user:7', 0, NULL, '2026-08-31 08:46:54.639'),
(2010, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 37, 'system:event:433:policy:studio-payment-received:user:8', 0, NULL, '2026-08-31 08:46:54.642'),
(2011, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 37, 'system:event:433:policy:studio-payment-received:user:9', 0, NULL, '2026-08-31 08:46:54.646'),
(2012, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 37, 'system:event:433:policy:studio-payment-received:user:10', 0, NULL, '2026-08-31 08:46:54.650'),
(2017, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 43206864-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 08:47:32.246'),
(2018, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 43206864-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 08:47:32.295'),
(2019, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 43206864-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 08:47:32.337'),
(2020, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 43206864-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 08:47:32.362'),
(2021, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 43206864-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 08:47:32.387'),
(2022, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 43206864-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 08:47:32.416'),
(2023, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 43206864-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 08:47:32.461'),
(2024, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 43206864-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 08:47:32.505'),
(2025, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 43206864-d', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 08:47:32.549'),
(2028, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 43206864-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9004970:policy:smoke-order-created:user:2', 0, NULL, '2026-08-31 08:47:32.686'),
(2029, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 43206864-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9004970:policy:smoke-order-created:user:3', 0, NULL, '2026-08-31 08:47:32.735'),
(2030, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 43206864-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9004970:policy:smoke-order-created:user:4', 0, NULL, '2026-08-31 08:47:32.778'),
(2031, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 43206864-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9004970:policy:smoke-order-created:user:5', 0, NULL, '2026-08-31 08:47:32.803'),
(2032, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 43206864-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9004970:policy:smoke-order-created:user:6', 0, NULL, '2026-08-31 08:47:32.828'),
(2033, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 43206864-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9004970:policy:smoke-order-created:user:7', 0, NULL, '2026-08-31 08:47:32.872'),
(2034, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 43206864-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9004970:policy:smoke-order-created:user:8', 0, NULL, '2026-08-31 08:47:32.916'),
(2035, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 43206864-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9004970:policy:smoke-order-created:user:9', 0, NULL, '2026-08-31 08:47:32.961'),
(2036, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 43206864-d', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9004970:policy:smoke-order-created:user:10', 0, NULL, '2026-08-31 08:47:33.005'),
(2048, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-43206864-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9004971:policy:craft-order-created:user:2', 0, NULL, '2026-08-31 08:47:33.186'),
(2049, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-43206864-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9004971:policy:craft-order-created:user:3', 0, NULL, '2026-08-31 08:47:33.232'),
(2050, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-43206864-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9004971:policy:craft-order-created:user:4', 0, NULL, '2026-08-31 08:47:33.277'),
(2051, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-43206864-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9004971:policy:craft-order-created:user:5', 0, NULL, '2026-08-31 08:47:33.321'),
(2052, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-43206864-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9004971:policy:craft-order-created:user:6', 0, NULL, '2026-08-31 08:47:33.366'),
(2053, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-43206864-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9004971:policy:craft-order-created:user:7', 0, NULL, '2026-08-31 08:47:33.412'),
(2054, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-43206864-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9004971:policy:craft-order-created:user:8', 0, NULL, '2026-08-31 08:47:33.457'),
(2055, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-43206864-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9004971:policy:craft-order-created:user:9', 0, NULL, '2026-08-31 08:47:33.498'),
(2056, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-43206864-d', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9004971:policy:craft-order-created:user:10', 0, NULL, '2026-08-31 08:47:33.543'),
(2068, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation 43206864-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8049190:action:0:user:2', 0, NULL, '2026-08-31 08:47:33.662'),
(2069, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation 43206864-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8049190:action:0:user:3', 0, NULL, '2026-08-31 08:47:33.705'),
(2070, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation 43206864-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8049190:action:0:user:4', 0, NULL, '2026-08-31 08:47:33.748'),
(2071, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation 43206864-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8049190:action:0:user:5', 0, NULL, '2026-08-31 08:47:33.792'),
(2072, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation 43206864-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8049190:action:0:user:6', 0, NULL, '2026-08-31 08:47:33.834'),
(2073, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation 43206864-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8049190:action:0:user:7', 0, NULL, '2026-08-31 08:47:33.876'),
(2074, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation 43206864-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8049190:action:0:user:8', 0, NULL, '2026-08-31 08:47:33.920'),
(2075, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation 43206864-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8049190:action:0:user:9', 0, NULL, '2026-08-31 08:47:33.962'),
(2076, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation 43206864-d', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8049190:action:0:user:10', 0, NULL, '2026-08-31 08:47:34.003'),
(2133, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 13, NULL, 0, NULL, '2026-08-31 08:47:59.960'),
(2134, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 13, NULL, 0, NULL, '2026-08-31 08:47:59.961'),
(2135, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 13, NULL, 0, NULL, '2026-08-31 08:47:59.962'),
(2136, 1, NULL, 2, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 14, NULL, 0, NULL, '2026-08-31 08:48:00.129'),
(2137, 1, NULL, 3, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 14, NULL, 0, NULL, '2026-08-31 08:48:00.131'),
(2138, 1, NULL, 4, 'system', 'users', 'warning', 'Pengajuan penghapusan akun', 'Ada pengajuan penghapusan akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_deletion_request', 14, NULL, 0, NULL, '2026-08-31 08:48:00.132'),
(2139, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 13, NULL, 0, NULL, '2026-08-31 08:48:00.560'),
(2140, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 13, NULL, 0, NULL, '2026-08-31 08:48:00.562'),
(2141, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 13, NULL, 0, NULL, '2026-08-31 08:48:00.563'),
(2142, 1, NULL, 2, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 14, NULL, 0, NULL, '2026-08-31 08:48:00.833'),
(2143, 1, NULL, 3, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 14, NULL, 0, NULL, '2026-08-31 08:48:00.835'),
(2144, 1, NULL, 4, 'system', 'users', 'info', 'Pengajuan aktivasi ulang akun', 'Ada pengajuan aktivasi ulang akun yang menunggu peninjauan eksekutif.', '/app/users', 'user_reactivation_request', 14, NULL, 0, NULL, '2026-08-31 08:48:00.837'),
(2146, 1, 2, 2, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000049', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 49, 'system:event:439:policy:studio-quotation-accepted:user:2', 0, NULL, '2026-08-31 15:46:04.654'),
(2147, 1, 2, 3, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000049', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 49, 'system:event:439:policy:studio-quotation-accepted:user:3', 0, NULL, '2026-08-31 15:46:04.779'),
(2148, 1, 2, 4, 'system', 'studio_billing', 'success', 'Penawaran diterima: QTN-000049', 'Klien telah menerima penawaran Studio.', '/app/studio/billing/quotations', 'quotation', 49, 'system:event:439:policy:studio-quotation-accepted:user:4', 0, NULL, '2026-08-31 15:46:04.944'),
(2153, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 2cd4cbb2-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:46:18.785'),
(2154, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 2cd4cbb2-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:46:18.789'),
(2155, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 2cd4cbb2-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:46:18.794'),
(2156, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 2cd4cbb2-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:46:18.798'),
(2157, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 2cd4cbb2-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:46:18.802'),
(2158, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 2cd4cbb2-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:46:18.806'),
(2159, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 2cd4cbb2-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:46:18.810'),
(2160, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 2cd4cbb2-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:46:18.814'),
(2161, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 2cd4cbb2-9', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:46:18.818'),
(2164, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 2cd4cbb2-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9009924:policy:smoke-order-created:user:2', 0, NULL, '2026-08-31 15:46:18.836'),
(2165, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 2cd4cbb2-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9009924:policy:smoke-order-created:user:3', 0, NULL, '2026-08-31 15:46:18.840'),
(2166, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 2cd4cbb2-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9009924:policy:smoke-order-created:user:4', 0, NULL, '2026-08-31 15:46:18.844'),
(2167, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 2cd4cbb2-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9009924:policy:smoke-order-created:user:5', 0, NULL, '2026-08-31 15:46:18.848'),
(2168, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 2cd4cbb2-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9009924:policy:smoke-order-created:user:6', 0, NULL, '2026-08-31 15:46:18.851'),
(2169, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 2cd4cbb2-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9009924:policy:smoke-order-created:user:7', 0, NULL, '2026-08-31 15:46:18.854'),
(2170, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 2cd4cbb2-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9009924:policy:smoke-order-created:user:8', 0, NULL, '2026-08-31 15:46:18.857'),
(2171, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 2cd4cbb2-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9009924:policy:smoke-order-created:user:9', 0, NULL, '2026-08-31 15:46:18.861'),
(2172, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 2cd4cbb2-9', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9009924:policy:smoke-order-created:user:10', 0, NULL, '2026-08-31 15:46:18.864'),
(2184, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2cd4cbb2-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9009925:policy:craft-order-created:user:2', 0, NULL, '2026-08-31 15:46:18.919'),
(2185, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2cd4cbb2-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9009925:policy:craft-order-created:user:3', 0, NULL, '2026-08-31 15:46:18.922'),
(2186, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2cd4cbb2-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9009925:policy:craft-order-created:user:4', 0, NULL, '2026-08-31 15:46:18.926'),
(2187, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2cd4cbb2-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9009925:policy:craft-order-created:user:5', 0, NULL, '2026-08-31 15:46:18.929'),
(2188, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2cd4cbb2-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9009925:policy:craft-order-created:user:6', 0, NULL, '2026-08-31 15:46:18.932'),
(2189, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2cd4cbb2-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9009925:policy:craft-order-created:user:7', 0, NULL, '2026-08-31 15:46:18.936'),
(2190, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2cd4cbb2-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9009925:policy:craft-order-created:user:8', 0, NULL, '2026-08-31 15:46:18.939'),
(2191, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2cd4cbb2-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9009925:policy:craft-order-created:user:9', 0, NULL, '2026-08-31 15:46:18.943'),
(2192, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-2cd4cbb2-9', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9009925:policy:craft-order-created:user:10', 0, NULL, '2026-08-31 15:46:18.946'),
(2204, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation 2cd4cbb2-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088666:action:0:user:2', 0, NULL, '2026-08-31 15:46:18.994'),
(2205, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation 2cd4cbb2-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088666:action:0:user:3', 0, NULL, '2026-08-31 15:46:18.997'),
(2206, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation 2cd4cbb2-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088666:action:0:user:4', 0, NULL, '2026-08-31 15:46:19.000'),
(2207, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation 2cd4cbb2-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088666:action:0:user:5', 0, NULL, '2026-08-31 15:46:19.004'),
(2208, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation 2cd4cbb2-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088666:action:0:user:6', 0, NULL, '2026-08-31 15:46:19.008'),
(2209, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation 2cd4cbb2-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088666:action:0:user:7', 0, NULL, '2026-08-31 15:46:19.010'),
(2210, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation 2cd4cbb2-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088666:action:0:user:8', 0, NULL, '2026-08-31 15:46:19.016'),
(2211, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation 2cd4cbb2-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088666:action:0:user:9', 0, NULL, '2026-08-31 15:46:19.019'),
(2212, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation 2cd4cbb2-9', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8088666:action:0:user:10', 0, NULL, '2026-08-31 15:46:19.021'),
(2217, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:449:policy:craft-order-created:user:3', 0, NULL, '2026-08-31 15:46:22.661'),
(2218, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:449:policy:craft-order-created:user:4', 0, NULL, '2026-08-31 15:46:22.756'),
(2219, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:449:policy:craft-order-created:user:10', 0, NULL, '2026-08-31 15:46:22.827'),
(2220, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:449:policy:craft-order-created:user:8', 0, NULL, '2026-08-31 15:46:22.894'),
(2221, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:449:policy:craft-order-created:user:7', 0, NULL, '2026-08-31 15:46:23.020'),
(2222, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:449:policy:craft-order-created:user:6', 0, NULL, '2026-08-31 15:46:23.084'),
(2223, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:449:policy:craft-order-created:user:5', 0, NULL, '2026-08-31 15:46:23.214'),
(2224, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:449:policy:craft-order-created:user:9', 0, NULL, '2026-08-31 15:46:23.315'),
(2225, 1, 2, 3, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:450:policy:studio-project-created:user:3', 0, NULL, '2026-08-31 15:46:27.731'),
(2226, 1, 2, 4, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:450:policy:studio-project-created:user:4', 0, NULL, '2026-08-31 15:46:27.852'),
(2227, 1, 2, 10, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:450:policy:studio-project-created:user:10', 0, NULL, '2026-08-31 15:46:28.038'),
(2228, 1, 2, 8, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:450:policy:studio-project-created:user:8', 0, NULL, '2026-08-31 15:46:28.134'),
(2229, 1, 2, 7, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:450:policy:studio-project-created:user:7', 0, NULL, '2026-08-31 15:46:28.554'),
(2230, 1, 2, 6, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:450:policy:studio-project-created:user:6', 0, NULL, '2026-08-31 15:46:28.645'),
(2231, 1, 2, 5, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:450:policy:studio-project-created:user:5', 0, NULL, '2026-08-31 15:46:28.690'),
(2232, 1, 2, 9, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:450:policy:studio-project-created:user:9', 0, NULL, '2026-08-31 15:46:28.741'),
(2243, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace 99317148-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:47:25.664'),
(2244, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace 99317148-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:47:25.667'),
(2245, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace 99317148-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:47:25.670'),
(2246, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace 99317148-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:47:25.674'),
(2247, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace 99317148-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:47:25.677'),
(2248, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace 99317148-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:47:25.680'),
(2249, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace 99317148-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:47:25.683'),
(2250, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace 99317148-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:47:25.686'),
(2251, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace 99317148-f', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-08-31 15:47:25.689'),
(2254, 1, 1, 2, 'system', 'craft_orders', 'info', 'System 99317148-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068999:policy:smoke-order-created:user:2', 0, NULL, '2026-08-31 15:47:25.702'),
(2255, 1, 1, 3, 'system', 'craft_orders', 'info', 'System 99317148-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068999:policy:smoke-order-created:user:3', 0, NULL, '2026-08-31 15:47:25.705'),
(2256, 1, 1, 4, 'system', 'craft_orders', 'info', 'System 99317148-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068999:policy:smoke-order-created:user:4', 0, NULL, '2026-08-31 15:47:25.709'),
(2257, 1, 1, 5, 'system', 'craft_orders', 'info', 'System 99317148-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068999:policy:smoke-order-created:user:5', 0, NULL, '2026-08-31 15:47:25.712'),
(2258, 1, 1, 6, 'system', 'craft_orders', 'info', 'System 99317148-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068999:policy:smoke-order-created:user:6', 0, NULL, '2026-08-31 15:47:25.715'),
(2259, 1, 1, 7, 'system', 'craft_orders', 'info', 'System 99317148-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068999:policy:smoke-order-created:user:7', 0, NULL, '2026-08-31 15:47:25.718'),
(2260, 1, 1, 8, 'system', 'craft_orders', 'info', 'System 99317148-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068999:policy:smoke-order-created:user:8', 0, NULL, '2026-08-31 15:47:25.721'),
(2261, 1, 1, 9, 'system', 'craft_orders', 'info', 'System 99317148-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068999:policy:smoke-order-created:user:9', 0, NULL, '2026-08-31 15:47:25.725'),
(2262, 1, 1, 10, 'system', 'craft_orders', 'info', 'System 99317148-f', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9068999:policy:smoke-order-created:user:10', 0, NULL, '2026-08-31 15:47:25.729'),
(2274, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-99317148-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9069000:policy:craft-order-created:user:2', 0, NULL, '2026-08-31 15:47:25.773'),
(2275, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-99317148-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9069000:policy:craft-order-created:user:3', 0, NULL, '2026-08-31 15:47:25.776'),
(2276, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-99317148-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9069000:policy:craft-order-created:user:4', 0, NULL, '2026-08-31 15:47:25.780'),
(2277, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-99317148-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9069000:policy:craft-order-created:user:5', 0, NULL, '2026-08-31 15:47:25.783'),
(2278, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-99317148-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9069000:policy:craft-order-created:user:6', 0, NULL, '2026-08-31 15:47:25.786'),
(2279, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-99317148-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9069000:policy:craft-order-created:user:7', 0, NULL, '2026-08-31 15:47:25.791'),
(2280, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-99317148-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9069000:policy:craft-order-created:user:8', 0, NULL, '2026-08-31 15:47:25.796'),
(2281, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-99317148-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9069000:policy:craft-order-created:user:9', 0, NULL, '2026-08-31 15:47:25.800'),
(2282, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-99317148-f', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9069000:policy:craft-order-created:user:10', 0, NULL, '2026-08-31 15:47:25.804'),
(2294, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation 99317148-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8069850:action:0:user:2', 0, NULL, '2026-08-31 15:47:25.858');
INSERT INTO `notifications` (`id`, `organization_id`, `business_unit_id`, `user_id`, `notification_type`, `module_code`, `severity_code`, `title`, `message`, `action_url`, `entity_type`, `entity_id`, `dedupe_key`, `is_read`, `read_at`, `created_at`) VALUES
(2295, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation 99317148-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8069850:action:0:user:3', 0, NULL, '2026-08-31 15:47:25.861'),
(2296, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation 99317148-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8069850:action:0:user:4', 0, NULL, '2026-08-31 15:47:25.865'),
(2297, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation 99317148-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8069850:action:0:user:5', 0, NULL, '2026-08-31 15:47:25.868'),
(2298, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation 99317148-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8069850:action:0:user:6', 0, NULL, '2026-08-31 15:47:25.871'),
(2299, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation 99317148-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8069850:action:0:user:7', 0, NULL, '2026-08-31 15:47:25.874'),
(2300, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation 99317148-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8069850:action:0:user:8', 0, NULL, '2026-08-31 15:47:25.876'),
(2301, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation 99317148-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8069850:action:0:user:9', 0, NULL, '2026-08-31 15:47:25.880'),
(2302, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation 99317148-f', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8069850:action:0:user:10', 0, NULL, '2026-08-31 15:47:25.883'),
(2353, 1, 2, 2, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 45, 'system:event:471:policy:studio-payment-received:user:2', 0, NULL, '2026-09-01 01:02:09.524'),
(2354, 1, 2, 3, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 45, 'system:event:471:policy:studio-payment-received:user:3', 0, NULL, '2026-09-01 01:02:09.528'),
(2355, 1, 2, 4, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 45, 'system:event:471:policy:studio-payment-received:user:4', 0, NULL, '2026-09-01 01:02:09.531'),
(2356, 1, 2, 5, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 45, 'system:event:471:policy:studio-payment-received:user:5', 0, NULL, '2026-09-01 01:02:09.535'),
(2357, 1, 2, 6, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 45, 'system:event:471:policy:studio-payment-received:user:6', 0, NULL, '2026-09-01 01:02:09.540'),
(2358, 1, 2, 7, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 45, 'system:event:471:policy:studio-payment-received:user:7', 0, NULL, '2026-09-01 01:02:09.544'),
(2359, 1, 2, 8, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 45, 'system:event:471:policy:studio-payment-received:user:8', 0, NULL, '2026-09-01 01:02:09.547'),
(2360, 1, 2, 9, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 45, 'system:event:471:policy:studio-payment-received:user:9', 0, NULL, '2026-09-01 01:02:09.552'),
(2361, 1, 2, 10, 'system', 'studio_finance', 'success', 'Pembayaran Studio diterima', 'Pembayaran telah tercatat pada keuangan Studio.', '/app/studio/finance/income', 'payment', 45, 'system:event:471:policy:studio-payment-received:user:10', 0, NULL, '2026-09-01 01:02:09.555'),
(2366, 1, 1, 2, 'smoke', 'craft_orders', 'warning', 'Workspace a541810e-4', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-01 01:02:18.382'),
(2367, 1, 1, 3, 'smoke', 'craft_orders', 'warning', 'Workspace a541810e-4', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-01 01:02:18.386'),
(2368, 1, 1, 4, 'smoke', 'craft_orders', 'warning', 'Workspace a541810e-4', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-01 01:02:18.389'),
(2369, 1, 1, 5, 'smoke', 'craft_orders', 'warning', 'Workspace a541810e-4', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-01 01:02:18.392'),
(2370, 1, 1, 6, 'smoke', 'craft_orders', 'warning', 'Workspace a541810e-4', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-01 01:02:18.395'),
(2371, 1, 1, 7, 'smoke', 'craft_orders', 'warning', 'Workspace a541810e-4', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-01 01:02:18.399'),
(2372, 1, 1, 8, 'smoke', 'craft_orders', 'warning', 'Workspace a541810e-4', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-01 01:02:18.403'),
(2373, 1, 1, 9, 'smoke', 'craft_orders', 'warning', 'Workspace a541810e-4', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-01 01:02:18.408'),
(2374, 1, 1, 10, 'smoke', 'craft_orders', 'warning', 'Workspace a541810e-4', 'Permission filtered workspace delivery', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-01 01:02:18.411'),
(2377, 1, 1, 2, 'system', 'craft_orders', 'info', 'System a541810e-4', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9013998:policy:smoke-order-created:user:2', 0, NULL, '2026-09-01 01:02:18.428'),
(2378, 1, 1, 3, 'system', 'craft_orders', 'info', 'System a541810e-4', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9013998:policy:smoke-order-created:user:3', 0, NULL, '2026-09-01 01:02:18.433'),
(2379, 1, 1, 4, 'system', 'craft_orders', 'info', 'System a541810e-4', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9013998:policy:smoke-order-created:user:4', 0, NULL, '2026-09-01 01:02:18.436'),
(2380, 1, 1, 5, 'system', 'craft_orders', 'info', 'System a541810e-4', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9013998:policy:smoke-order-created:user:5', 0, NULL, '2026-09-01 01:02:18.440'),
(2381, 1, 1, 6, 'system', 'craft_orders', 'info', 'System a541810e-4', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9013998:policy:smoke-order-created:user:6', 0, NULL, '2026-09-01 01:02:18.442'),
(2382, 1, 1, 7, 'system', 'craft_orders', 'info', 'System a541810e-4', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9013998:policy:smoke-order-created:user:7', 0, NULL, '2026-09-01 01:02:18.445'),
(2383, 1, 1, 8, 'system', 'craft_orders', 'info', 'System a541810e-4', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9013998:policy:smoke-order-created:user:8', 0, NULL, '2026-09-01 01:02:18.449'),
(2384, 1, 1, 9, 'system', 'craft_orders', 'info', 'System a541810e-4', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9013998:policy:smoke-order-created:user:9', 0, NULL, '2026-09-01 01:02:18.453'),
(2385, 1, 1, 10, 'system', 'craft_orders', 'info', 'System a541810e-4', 'Retry-safe delivery', '/app/craft/orders', 'craft_order', 12345, 'system:event:9013998:policy:smoke-order-created:user:10', 0, NULL, '2026-09-01 01:02:18.456'),
(2397, 1, 1, 2, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-a541810e-4', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9013999:policy:craft-order-created:user:2', 0, NULL, '2026-09-01 01:02:18.506'),
(2398, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-a541810e-4', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9013999:policy:craft-order-created:user:3', 0, NULL, '2026-09-01 01:02:18.509'),
(2399, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-a541810e-4', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9013999:policy:craft-order-created:user:4', 0, NULL, '2026-09-01 01:02:18.512'),
(2400, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-a541810e-4', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9013999:policy:craft-order-created:user:5', 0, NULL, '2026-09-01 01:02:18.516'),
(2401, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-a541810e-4', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9013999:policy:craft-order-created:user:6', 0, NULL, '2026-09-01 01:02:18.519'),
(2402, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-a541810e-4', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9013999:policy:craft-order-created:user:7', 0, NULL, '2026-09-01 01:02:18.523'),
(2403, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-a541810e-4', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9013999:policy:craft-order-created:user:8', 0, NULL, '2026-09-01 01:02:18.526'),
(2404, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-a541810e-4', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9013999:policy:craft-order-created:user:9', 0, NULL, '2026-09-01 01:02:18.529'),
(2405, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SYS-a541810e-4', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 12346, 'system:event:9013999:policy:craft-order-created:user:10', 0, NULL, '2026-09-01 01:02:18.533'),
(2417, 1, 1, 2, 'automation', 'craft_orders', 'info', 'Automation a541810e-4', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8019134:action:0:user:2', 0, NULL, '2026-09-01 01:02:18.570'),
(2418, 1, 1, 3, 'automation', 'craft_orders', 'info', 'Automation a541810e-4', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8019134:action:0:user:3', 0, NULL, '2026-09-01 01:02:18.573'),
(2419, 1, 1, 4, 'automation', 'craft_orders', 'info', 'Automation a541810e-4', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8019134:action:0:user:4', 0, NULL, '2026-09-01 01:02:18.576'),
(2420, 1, 1, 5, 'automation', 'craft_orders', 'info', 'Automation a541810e-4', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8019134:action:0:user:5', 0, NULL, '2026-09-01 01:02:18.579'),
(2421, 1, 1, 6, 'automation', 'craft_orders', 'info', 'Automation a541810e-4', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8019134:action:0:user:6', 0, NULL, '2026-09-01 01:02:18.582'),
(2422, 1, 1, 7, 'automation', 'craft_orders', 'info', 'Automation a541810e-4', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8019134:action:0:user:7', 0, NULL, '2026-09-01 01:02:18.585'),
(2423, 1, 1, 8, 'automation', 'craft_orders', 'info', 'Automation a541810e-4', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8019134:action:0:user:8', 0, NULL, '2026-09-01 01:02:18.588'),
(2424, 1, 1, 9, 'automation', 'craft_orders', 'info', 'Automation a541810e-4', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8019134:action:0:user:9', 0, NULL, '2026-09-01 01:02:18.591'),
(2425, 1, 1, 10, 'automation', 'craft_orders', 'info', 'Automation a541810e-4', 'Automation notification', NULL, 'craft_order', 12345, 'automation:run:8019134:action:0:user:10', 0, NULL, '2026-09-01 01:02:18.594'),
(2476, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:473:policy:craft-order-created:user:3', 0, NULL, '2026-09-01 02:45:08.764'),
(2477, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:473:policy:craft-order-created:user:4', 0, NULL, '2026-09-01 02:45:08.769'),
(2478, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:473:policy:craft-order-created:user:10', 0, NULL, '2026-09-01 02:45:08.773'),
(2479, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:473:policy:craft-order-created:user:8', 0, NULL, '2026-09-01 02:45:08.778'),
(2480, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:473:policy:craft-order-created:user:7', 0, NULL, '2026-09-01 02:45:08.782'),
(2481, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:473:policy:craft-order-created:user:6', 0, NULL, '2026-09-01 02:45:08.785'),
(2482, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:473:policy:craft-order-created:user:5', 0, NULL, '2026-09-01 02:45:08.788'),
(2483, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:473:policy:craft-order-created:user:9', 0, NULL, '2026-09-01 02:45:08.792'),
(2484, 1, 2, 3, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:474:policy:studio-project-created:user:3', 0, NULL, '2026-09-01 02:45:11.757'),
(2485, 1, 2, 4, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:474:policy:studio-project-created:user:4', 0, NULL, '2026-09-01 02:45:11.761'),
(2486, 1, 2, 10, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:474:policy:studio-project-created:user:10', 0, NULL, '2026-09-01 02:45:11.765'),
(2487, 1, 2, 8, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:474:policy:studio-project-created:user:8', 0, NULL, '2026-09-01 02:45:11.768'),
(2488, 1, 2, 7, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:474:policy:studio-project-created:user:7', 0, NULL, '2026-09-01 02:45:11.771'),
(2489, 1, 2, 6, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:474:policy:studio-project-created:user:6', 0, NULL, '2026-09-01 02:45:11.774'),
(2490, 1, 2, 5, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:474:policy:studio-project-created:user:5', 0, NULL, '2026-09-01 02:45:11.777'),
(2491, 1, 2, 9, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:474:policy:studio-project-created:user:9', 0, NULL, '2026-09-01 02:45:11.781'),
(2492, 1, 1, 3, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:475:policy:craft-order-created:user:3', 0, NULL, '2026-09-01 03:03:20.638'),
(2493, 1, 1, 4, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:475:policy:craft-order-created:user:4', 0, NULL, '2026-09-01 03:03:20.642'),
(2494, 1, 1, 10, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:475:policy:craft-order-created:user:10', 0, NULL, '2026-09-01 03:03:20.649'),
(2495, 1, 1, 8, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:475:policy:craft-order-created:user:8', 0, NULL, '2026-09-01 03:03:20.653'),
(2496, 1, 1, 7, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:475:policy:craft-order-created:user:7', 0, NULL, '2026-09-01 03:03:20.657'),
(2497, 1, 1, 6, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:475:policy:craft-order-created:user:6', 0, NULL, '2026-09-01 03:03:20.661'),
(2498, 1, 1, 5, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:475:policy:craft-order-created:user:5', 0, NULL, '2026-09-01 03:03:20.667'),
(2499, 1, 1, 9, 'system', 'craft_orders', 'info', 'Pesanan baru SMOKE', 'Pesanan baru telah masuk dan siap ditinjau.', '/app/craft/orders', 'craft_order', 999999999, 'system:event:475:policy:craft-order-created:user:9', 0, NULL, '2026-09-01 03:03:20.672'),
(2500, 1, 2, 3, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:476:policy:studio-project-created:user:3', 0, NULL, '2026-09-01 03:03:20.816'),
(2501, 1, 2, 4, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:476:policy:studio-project-created:user:4', 0, NULL, '2026-09-01 03:03:20.820'),
(2502, 1, 2, 10, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:476:policy:studio-project-created:user:10', 0, NULL, '2026-09-01 03:03:20.824'),
(2503, 1, 2, 8, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:476:policy:studio-project-created:user:8', 0, NULL, '2026-09-01 03:03:20.831'),
(2504, 1, 2, 7, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:476:policy:studio-project-created:user:7', 0, NULL, '2026-09-01 03:03:20.835'),
(2505, 1, 2, 6, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:476:policy:studio-project-created:user:6', 0, NULL, '2026-09-01 03:03:20.839'),
(2506, 1, 2, 5, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:476:policy:studio-project-created:user:5', 0, NULL, '2026-09-01 03:03:20.843'),
(2507, 1, 2, 9, 'system', 'studio_projects', 'info', 'Proyek baru SMOKE', 'Smoke siap untuk ditinjau.', '/app/studio/projects', 'studio_project', 999999999, 'system:event:476:policy:studio-project-created:user:9', 0, NULL, '2026-09-01 03:03:20.848');

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
(1, 'UNI-INSIDE', 'Uni-Inside Studio', 'Uni-Inside Studio', NULL, NULL, NULL, NULL, NULL, NULL, 'ID', 'IDR', 'Asia/Jakarta', 'organization-logos/1/b8d89eb2-1a99-4c79-95b3-5679282b3026.webp', 1, '2026-08-22 07:48:09.689', '2026-08-31 15:54:52.936');

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
(66, 'reports.read', 'reports', 'Lihat Pusat Laporan', 'Melihat katalog, preview, ringkasan, dan histori laporan yang dapat diakses melalui Pusat Laporan UNI-NEXUS.', '2026-08-31 16:47:52.072');

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
(11, 1, 1, 'CRAFT_PROFITABILITY_ANALYTICS', 'Analitik Profitabilitas', 'profitability', '{\"scope\": \"craft\", \"version\": 1, \"report_key\": \"profitability\"}', 0, 1, NULL, '2026-08-27 09:20:18.504', '2026-08-27 09:20:18.504'),
(12, 1, 2, 'STUDIO_ANALYTICS_OVERVIEW', 'Ringkasan Analitik Studio', 'overview', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"overview\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(13, 1, 2, 'STUDIO_PROJECT_ANALYTICS', 'Analitik Proyek Studio', 'projects', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"projects\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(14, 1, 2, 'STUDIO_CLIENT_ANALYTICS', 'Analitik Klien Studio', 'clients', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"clients\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(15, 1, 2, 'STUDIO_SERVICE_ANALYTICS', 'Analitik Layanan Studio', 'services', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"services\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(16, 1, 2, 'STUDIO_COMMERCIAL_ANALYTICS', 'Analitik Penawaran & Penagihan Studio', 'commercial', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"commercial\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(17, 1, 2, 'STUDIO_REVENUE_ANALYTICS', 'Pendapatan & Arus Kas Studio', 'revenue', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"revenue\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(18, 1, 2, 'STUDIO_PROFITABILITY_ANALYTICS', 'Profitabilitas Studio', 'profitability', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"profitability\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(19, 1, 2, 'STUDIO_RECEIVABLE_ANALYTICS', 'Piutang Studio', 'receivables', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"receivables\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(20, 1, 2, 'STUDIO_VENDOR_ANALYTICS', 'Vendor & Freelancer Studio', 'vendors', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"vendors\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(21, 1, 2, 'STUDIO_EQUIPMENT_ANALYTICS', 'Peralatan & Aset Studio', 'equipment', '{\"scope\": \"studio\", \"version\": 1, \"report_key\": \"equipment\"}', 0, 1, NULL, '2026-08-31 16:47:52.141', '2026-08-31 16:47:52.141'),
(27, 1, NULL, 'GLOBAL_EXECUTIVE_SUMMARY', 'Ringkasan Eksekutif UNI-NEXUS', 'executive-summary', '{\"scope\": \"global\", \"version\": 1, \"report_key\": \"executive-summary\"}', 0, 1, NULL, '2026-08-31 16:47:52.169', '2026-08-31 16:47:52.169'),
(28, 1, NULL, 'UNIFIED_FINANCE_OVERVIEW', 'Ringkasan Keuangan Terpadu', 'overview', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"overview\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201'),
(29, 1, NULL, 'UNIFIED_FINANCE_TRANSACTIONS', 'Transaksi Keuangan Terpadu', 'transactions', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"transactions\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201'),
(30, 1, NULL, 'UNIFIED_FINANCE_TREASURY', 'Kas & Bank Terpadu', 'treasury', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"treasury\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201'),
(31, 1, NULL, 'UNIFIED_FINANCE_TRANSFERS', 'Transfer Internal', 'transfers', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"transfers\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201'),
(32, 1, NULL, 'UNIFIED_FINANCE_CASH_FLOW', 'Arus Kas Terpadu', 'cash-flow', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"cash-flow\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201'),
(33, 1, NULL, 'UNIFIED_FINANCE_PROFIT_LOSS', 'Laba Rugi Terpadu', 'profit-loss', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"profit-loss\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201'),
(34, 1, NULL, 'UNIFIED_FINANCE_RECEIVABLES', 'Piutang Terpadu', 'receivables', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"receivables\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201'),
(35, 1, NULL, 'UNIFIED_FINANCE_PAYABLES', 'Hutang Terpadu', 'payables', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"payables\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201'),
(36, 1, NULL, 'UNIFIED_FINANCE_BUDGETS', 'Anggaran Terpadu', 'budgets', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"budgets\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201'),
(37, 1, NULL, 'UNIFIED_FINANCE_JOURNALS', 'Jurnal Akuntansi Terpadu', 'journals', '{\"scope\": \"unified_finance\", \"version\": 1, \"report_key\": \"journals\"}', 0, 1, NULL, '2026-08-31 16:47:52.201', '2026-08-31 16:47:52.201');

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
(8, 66, '2026-08-31 16:47:52.106');

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
  `scope_business_unit_id` bigint UNSIGNED GENERATED ALWAYS AS (coalesce(`business_unit_id`,0)) STORED,
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

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `organization_id`, `business_unit_id`, `task_code`, `title`, `description`, `status_code`, `priority_code`, `start_at`, `due_at`, `reminder_minutes_before`, `source_module_code`, `source_type`, `source_id`, `source_code`, `source_key`, `created_by`, `updated_by`, `completed_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(16, 1, 1, 'TSK-000016', 'Browser tugas e42b104a', NULL, 'in_progress', 'normal', '2026-08-31 21:14:00.000', '2026-08-31 21:14:00.000', NULL, 'tasks', 'manual', NULL, NULL, NULL, 2, 2, NULL, '2026-08-31 11:14:55.510', '2026-08-31 11:15:39.729', NULL);

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
(8, 1, 2, 'STUDIO_PROJECT_COST', 'Biaya Proyek Studio', 'expense', 15, 1),
(9, 1, 3, 'SHARED_OTHER_INCOME', 'Pendapatan Bersama / Lain-lain', 'income', 10, 1);

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
(2, 1, NULL, 'Muhammad Taqi Izdihar', 'taqizdihar', 'm.taqizdihar@gmail.com', '$2b$10$FBvL5LNb8H8BCzDQMv/Hnul/muHkH7PvDe3AV0h7KKHqjfGmK2nj6', NULL, 'avatars/ee283f29-d194-4dca-8853-904d59a20588.jpg', 'profile-banners/81a93810-84a1-4d74-9ddb-ca56790b43b4.png', 'default', 'active', 'approved', 'bootstrap', '2026-08-23 10:07:06.542', NULL, '2026-08-23 10:07:06.542', NULL, NULL, NULL, 'craft', NULL, '2026-08-31 19:24:19.507', NULL, 0, '2026-08-23 10:07:06.542', '2026-08-31 19:24:19.507', NULL),
(3, 1, NULL, 'April Adzania', 'apriladzania', 'april.adzania@gmail.com', '$2b$10$RBpHzttXQPDNvppR6Xgq6ehLMxyYZ2f4GNiGNIIDZeXXN8OajzZXe', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:14:08.000', 2, '2026-08-23 10:50:09.750', NULL, NULL, NULL, 'craft', NULL, '2026-08-31 09:40:31.903', NULL, 0, '2026-08-23 10:14:08.000', '2026-08-31 09:40:31.903', NULL),
(4, 1, NULL, 'Dian Daeli', 'diandaeli', 'diandaeli125@gmail.com', '$2b$10$XabxUPPEFMYg4wZXR.zEIu37A9xnaMwT/g1oMY4UQxU42G0a2Lpx2', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:14:40.763', 2, '2026-08-23 10:50:05.934', NULL, NULL, NULL, 'craft', NULL, '2026-08-23 11:10:35.701', NULL, 0, '2026-08-23 10:14:40.763', '2026-08-28 11:43:00.744', NULL),
(5, 1, NULL, 'Naura Ramadhani', 'nauraramadhani', 'nauraramadhani.nr32@gmail.com', '$2b$10$RLbe7PCKBRA535LsSCKJOuKbDN55MqfItEI1lN8eJtXApHUwU5v02', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:16:56.533', 2, '2026-08-23 10:50:00.349', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:16:56.533', '2026-08-23 10:50:00.349', NULL),
(6, 1, NULL, 'Amadea Salsabila', 'amadeasalsabila', 'rilldmnti@gmail.com', '$2b$10$3iUttKFVotoqazxXHSJvfeB3g4zAgQ85KaqjUi6kJsD7oGyz/hdSK', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:17:33.382', 2, '2026-08-23 10:49:54.447', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:17:33.382', '2026-08-23 10:49:54.447', NULL),
(7, 1, NULL, 'Cantika Anggi', 'cantikaanggi', 'cantikaanggianggraheni@gmail.com', '$2b$10$RB6gn.zNfGvtYdSuVOEIpuBziKzZ6DaOT1/g0IJZXaFI1yQYT4NPu', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:18:10.986', 2, '2026-08-23 10:49:50.871', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:18:10.986', '2026-08-23 10:49:50.871', NULL),
(8, 1, NULL, 'Siti Amany Fakhirah Riby', 'sitiamanyfakhirahriby', 'amanyfrss@gmail.com', '$2b$10$DInVMuTao6S.gXLHN1LDOesJsPICEsMBqaHg05T8in7xUYXOsW35O', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:19:35.785', 2, '2026-08-23 10:49:46.824', NULL, NULL, NULL, 'craft', NULL, NULL, NULL, 0, '2026-08-23 10:19:35.785', '2026-08-23 10:49:46.824', NULL),
(9, 1, NULL, 'Ahmad Ropaldo', 'ahmadropaldo', 'ahmadropaldo@gmail.com', '$2b$10$JBBoBb3h1j5idkGu0u.lSunIXGwWoLAmiPD7GzA18yEK5BAopsWOG', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:20:05.570', 2, '2026-08-23 10:49:42.815', NULL, NULL, NULL, 'craft', NULL, '2026-08-28 08:38:38.035', NULL, 0, '2026-08-23 10:20:05.570', '2026-08-28 08:38:38.035', NULL),
(10, 1, NULL, 'Nadine Nathania Pelleng', 'nadinenathaniapelleng', 'nathaniapelleng15@gmail.com', '$2b$10$3PbnHpPuPG2Y.kt/TLzMLuH7ZbjA3VPM5lg4obU/yIqnxIVkO1CuC', NULL, NULL, NULL, 'default', 'active', 'approved', 'self_signup', '2026-08-23 10:20:42.456', 2, '2026-08-23 10:49:37.870', NULL, NULL, NULL, 'craft', NULL, '2026-08-28 08:39:38.944', NULL, 0, '2026-08-23 10:20:42.456', '2026-08-28 08:39:38.944', NULL);

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
(1, 1, 2, '64392b0a-73c2-4f3b-9e89-4e456c3a8b59', 'craft', '2026-08-28 01:17:11.141', '2026-08-28 08:51:02.313', '2026-08-28 09:13:08.134'),
(6, 1, 9, '8387d24c-f324-46be-9d54-1692088c4bd6', 'craft', '2026-08-28 01:38:38.262', '2026-08-28 01:45:42.168', '2026-08-28 01:45:43.044'),
(7, 1, 9, '3ee7a301-60e6-4c8d-a44d-8613abdd0661', 'craft', '2026-08-28 01:39:00.069', '2026-08-28 01:39:04.747', '2026-08-28 01:39:10.984'),
(8, 1, 10, '8d0f0007-81cb-4b39-8aa0-cee6d5d422a4', 'craft', '2026-08-28 01:39:39.199', '2026-08-28 01:45:44.520', '2026-08-28 01:45:45.180'),
(15, 1, 2, '1a82fa53-90a9-4687-97c2-07083118f5fc', 'craft', '2026-08-29 08:14:36.806', '2026-08-29 11:45:26.555', '2026-08-29 11:48:24.292'),
(16, 1, 2, '20bcc66b-5ef5-4dd8-9b5d-50794183df59', 'craft', '2026-08-29 13:48:00.153', '2026-08-29 15:13:56.429', NULL),
(17, 1, 2, '6cbab24b-7190-40b3-8531-acabb08cb6dc', 'craft', '2026-08-29 23:14:40.111', '2026-08-30 06:13:52.707', NULL),
(54, 1, 2, '851b6bd5-b1f8-44c6-ab93-cad1bb64f349', 'craft', '2026-08-31 01:42:41.665', '2026-08-31 02:13:24.814', '2026-08-31 02:13:42.739'),
(56, 1, 2, '13010673-21ae-4cf1-bb8c-9573a8bac0f4', 'craft', '2026-08-31 02:37:54.060', '2026-08-31 02:39:52.311', '2026-08-31 02:39:54.984'),
(57, 1, 2, '1746408c-8eae-408e-a114-48335a411e40', 'craft', '2026-08-31 02:40:09.039', '2026-08-31 02:40:09.039', '2026-08-31 02:40:21.639'),
(59, 1, 3, 'f809296d-61ae-453c-8b9d-89b1ca0ec678', 'craft', '2026-08-31 02:40:32.064', '2026-08-31 02:40:32.079', '2026-08-31 02:40:45.897'),
(60, 1, 2, '2b0ed4c0-d702-4801-b5da-5379755eb810', 'craft', '2026-08-31 02:40:52.034', '2026-08-31 03:01:44.212', NULL),
(61, 1, 2, 'f26d0169-8ed2-4d76-868b-4cf0f334d9fc', 'craft', '2026-08-31 04:01:16.817', '2026-08-31 04:01:16.817', NULL),
(63, 1, 2, '8c153e01-5658-4635-a27c-cf3b0e1f556b', 'craft', '2026-08-31 04:03:24.291', '2026-08-31 04:03:24.341', NULL),
(64, 1, 2, 'e1a35121-a59a-4c41-a93f-b70be58f4812', 'craft', '2026-08-31 04:04:03.979', '2026-08-31 04:04:03.979', NULL),
(66, 1, 2, '52babd3e-8d24-4c29-a71e-c5c88638075f', 'craft', '2026-08-31 04:04:46.406', '2026-08-31 04:04:46.414', NULL),
(67, 1, 2, '71581e8a-3642-4f5e-985b-fcb020dc2c30', 'craft', '2026-08-31 04:05:11.638', '2026-08-31 04:05:11.657', NULL),
(68, 1, 2, '6661feca-65a4-461b-badb-a9070938b872', 'craft', '2026-08-31 04:05:54.388', '2026-08-31 04:05:54.397', NULL),
(69, 1, 2, '562b068a-b0df-4cca-b6b4-fe6fe856dad9', 'craft', '2026-08-31 04:13:35.577', '2026-08-31 04:13:35.577', NULL),
(71, 1, 2, '0730018d-8178-43f1-a06d-f175c8b767f1', 'craft', '2026-08-31 04:14:53.660', '2026-08-31 04:14:53.660', NULL),
(73, 1, 2, '44072478-772a-4ec7-be89-b83e401a4df1', 'craft', '2026-08-31 04:15:37.149', '2026-08-31 04:15:37.191', NULL),
(74, 1, 2, '61152c61-07a4-4099-893e-6571050a78d7', 'craft', '2026-08-31 04:22:02.861', '2026-08-31 04:22:02.874', NULL),
(75, 1, 2, 'fe18bbef-b3af-42da-95b4-12fa2b7d8e62', 'craft', '2026-08-31 04:26:13.917', '2026-08-31 05:24:15.108', '2026-08-31 05:24:41.019'),
(79, 1, 2, '35406a3d-15d1-4376-a130-5fc9569530ef', 'craft', '2026-08-31 05:44:14.668', '2026-08-31 05:44:14.683', NULL),
(80, 1, 2, '3271c6ea-c8d0-45e6-b893-a600ba334794', 'craft', '2026-08-31 05:44:48.416', '2026-08-31 05:44:48.416', NULL),
(82, 1, 2, '01876f5c-fb7f-4104-9255-6383dbc4da21', 'craft', '2026-08-31 05:45:28.511', '2026-08-31 05:45:28.511', NULL),
(84, 1, 2, '4fbd588b-631b-40b2-80e5-ef1c952e3ac3', 'craft', '2026-08-31 05:46:03.114', '2026-08-31 05:46:03.119', NULL),
(85, 1, 2, '9c4fbbd3-1404-4e5e-b134-4b49ac8e4621', 'craft', '2026-08-31 05:47:19.557', '2026-08-31 05:47:19.557', NULL),
(87, 1, 2, '26f26c46-eaec-4913-aa86-05a210bb55c1', 'craft', '2026-08-31 05:48:34.431', '2026-08-31 05:48:34.436', NULL),
(88, 1, 2, '03b71fac-0b25-4963-82c2-4e7a50e71ea5', 'craft', '2026-08-31 05:49:57.022', '2026-08-31 05:49:57.022', NULL),
(93, 1, 2, '1fa11424-debc-4536-bf70-b111e2e90c99', 'craft', '2026-08-31 05:54:15.435', '2026-08-31 05:54:15.435', NULL),
(95, 1, 2, 'e4af2735-ba3f-4f93-a74b-0765b269052e', 'craft', '2026-08-31 05:54:32.866', '2026-08-31 05:54:32.866', NULL),
(99, 1, 2, '393ad969-1142-4db4-8662-7bb7e42cf130', 'craft', '2026-08-31 05:54:55.702', '2026-08-31 05:54:55.702', NULL),
(101, 1, 2, '176b9986-fcf5-4864-acb2-526ef73854e1', 'craft', '2026-08-31 05:57:30.793', '2026-08-31 05:57:30.839', NULL),
(102, 1, 2, 'a5c7fa0d-8ca3-4cb3-876b-97191f010329', 'craft', '2026-08-31 06:00:09.522', '2026-08-31 06:00:09.572', NULL),
(103, 1, 2, '2092713a-e61c-4cec-bf94-41db697b54a3', 'craft', '2026-08-31 06:01:21.231', '2026-08-31 06:01:21.233', NULL),
(106, 1, 2, '65a29436-1c64-44d7-b189-8a9eedfc2e4a', 'craft', '2026-08-31 06:07:30.545', '2026-08-31 06:07:30.545', NULL),
(110, 1, 2, '96310a19-edad-404d-87a9-b2ab8838f859', 'craft', '2026-08-31 06:07:42.481', '2026-08-31 06:07:42.524', NULL),
(111, 1, 2, 'e59355ef-513a-4134-8f3f-283086ec2497', 'craft', '2026-08-31 06:08:10.895', '2026-08-31 06:08:10.936', NULL),
(112, 1, 2, '0bf8c232-da55-4cb6-aef4-7982e623703d', 'craft', '2026-08-31 06:09:34.595', '2026-08-31 06:09:34.595', NULL),
(114, 1, 2, '45c68cbe-8af3-48c0-906e-8b5857ae4a75', 'craft', '2026-08-31 06:17:39.098', '2026-08-31 06:17:39.100', NULL),
(118, 1, 2, 'c7cabf88-ff59-4334-bddd-c6e8fe1b251c', 'craft', '2026-08-31 06:24:24.383', '2026-08-31 06:24:24.383', NULL),
(120, 1, 2, 'cd892cc4-58a4-42d4-9bf9-1d460882d233', 'craft', '2026-08-31 06:25:30.702', '2026-08-31 06:25:30.702', NULL),
(122, 1, 2, '5284c264-54e0-417a-b479-aac61ec1f9ae', 'craft', '2026-08-31 06:26:50.171', '2026-08-31 06:26:50.305', NULL),
(123, 1, 2, '2c4b0766-d6c9-4e85-8f61-ba616ef5d96f', 'craft', '2026-08-31 08:41:39.890', '2026-08-31 08:41:39.930', NULL),
(124, 1, 2, '068637d2-ebd6-4fcb-8718-2d17ae8c3c7d', 'craft', '2026-08-31 08:41:55.882', '2026-08-31 08:41:55.882', NULL),
(126, 1, 2, 'e258a85e-ef36-484c-a14c-86458573415c', 'craft', '2026-08-31 08:42:14.311', '2026-08-31 08:42:14.311', NULL),
(128, 1, 2, 'e50ad226-1348-48ff-b4b7-2d8cd6605642', 'craft', '2026-08-31 08:42:30.960', '2026-08-31 08:42:30.960', NULL),
(130, 1, 2, '44ba5e2f-bb2b-4c9d-a58a-caccfbaccf12', 'craft', '2026-08-31 08:43:02.401', '2026-08-31 08:43:02.446', NULL),
(131, 1, 2, '2150a76e-4cc3-4779-8334-5c7e4131c7c9', 'craft', '2026-08-31 08:43:30.364', '2026-08-31 08:43:30.425', NULL),
(132, 1, 2, '0c0eb558-7af0-4ea9-8fa4-8edfc263488d', 'craft', '2026-08-31 08:44:08.482', '2026-08-31 08:44:08.482', NULL),
(133, 1, 2, 'ef19564a-f18a-4a15-a6d0-959ce8d3c267', 'craft', '2026-08-31 08:44:41.901', '2026-08-31 08:44:41.901', NULL),
(135, 1, 2, '689df013-4bfc-4380-84f7-82135861ec52', 'studio', '2026-08-31 08:45:37.417', '2026-08-31 08:45:40.957', NULL),
(139, 1, 2, '064c7a94-d6d5-4db7-82e7-bc8132821efa', 'craft', '2026-08-31 08:51:06.814', '2026-08-31 08:51:06.814', NULL),
(141, 1, 2, 'a4b1047e-ceb2-4338-8ca6-186b08af6d9f', 'craft', '2026-08-31 08:52:01.045', '2026-08-31 08:52:01.056', NULL),
(142, 1, 2, '44afd578-f0ea-4ef5-b76c-b9eb1532ff63', 'craft', '2026-08-31 08:52:53.706', '2026-08-31 08:52:53.708', NULL),
(143, 1, 2, '26f83f1d-50af-47ef-b079-3ef233e229a6', 'craft', '2026-08-31 08:53:59.985', '2026-08-31 08:54:00.029', NULL),
(144, 1, 2, '4e767b22-2e98-413d-989f-532ff4604859', 'studio', '2026-08-31 08:54:56.123', '2026-08-31 08:55:00.289', NULL),
(145, 1, 2, 'ae614059-9a08-4c2e-bcb3-c4a49cae98bc', 'craft', '2026-08-31 09:01:21.586', '2026-08-31 09:48:19.966', NULL),
(147, 1, 2, 'afa1a1f9-1cdf-4757-a671-fe1ccb3e62f9', 'craft', '2026-08-31 12:24:19.971', '2026-08-31 12:32:17.369', NULL),
(152, 1, 2, '6a76f5e9-ef6c-4fbd-bb20-b13218811670', 'craft', '2026-08-31 15:36:08.238', '2026-08-31 15:36:08.239', NULL),
(153, 1, 2, 'b508fddb-34bf-4abc-83a5-2ee28487c1ff', 'craft', '2026-08-31 15:37:17.473', '2026-08-31 15:37:17.473', NULL),
(154, 1, 2, '5cb98179-f62b-4a2f-91ca-f9501d283183', 'craft', '2026-08-31 15:38:26.199', '2026-08-31 15:38:26.199', NULL),
(156, 1, 2, '7a3c17db-8550-4e29-a162-8cc2b9348ecb', 'craft', '2026-08-31 15:39:42.507', '2026-08-31 15:39:42.507', NULL),
(158, 1, 2, '42fbd044-c68e-45c6-87ab-3b3176ebc07a', 'studio', '2026-08-31 15:44:22.851', '2026-08-31 15:44:23.929', NULL),
(163, 1, 2, 'c515d2f0-0db8-49c5-b01e-c3577425a215', 'studio', '2026-08-31 15:50:01.258', '2026-08-31 15:50:02.375', NULL),
(165, 1, 2, '2fa322b1-43e1-4112-a1ed-5760f19d6f2f', 'craft', '2026-08-31 15:53:20.313', '2026-08-31 15:53:20.330', NULL),
(166, 1, 2, '8698c965-a56f-4948-8d87-b224ddae8a03', 'craft', '2026-08-31 15:53:59.532', '2026-08-31 15:53:59.535', NULL),
(167, 1, 2, '5bcc0cfd-125f-42d5-be2a-c1ee0b0fff3c', 'craft', '2026-08-31 15:54:52.437', '2026-08-31 15:54:52.439', NULL),
(168, 1, 2, 'bbe71669-4ff1-4740-aaab-6bf080e990a6', 'studio', '2026-08-31 15:55:31.105', '2026-08-31 15:55:32.063', NULL),
(170, 1, 2, 'cc46f106-d7d7-4e95-986e-3d1b6ed1a903', 'studio', '2026-09-01 01:01:47.419', '2026-09-01 01:01:48.725', NULL),
(171, 1, 2, 'a02bffe3-459a-4b66-8296-cb1c5a39820e', 'craft', '2026-09-01 02:48:58.113', '2026-09-01 02:48:58.147', NULL),
(172, 1, 2, '93e9b019-fe74-4efd-8ff9-2cedb831a7cf', 'craft', '2026-09-01 02:49:46.754', '2026-09-01 02:49:46.775', NULL),
(173, 1, 2, '74fbadbd-9481-4e75-b08b-21a1129b6874', 'craft', '2026-09-01 02:50:32.597', '2026-09-01 02:50:32.603', NULL),
(174, 1, 2, 'db177e3c-9eec-4dd5-9c35-e339b80c87e6', 'craft', '2026-09-01 02:51:22.719', '2026-09-01 02:51:24.355', NULL),
(175, 1, 2, '8d574f95-7316-48e2-8592-8e476efe9a18', 'craft', '2026-09-01 02:52:06.533', '2026-09-01 02:52:08.623', NULL),
(176, 1, 2, '52a5083c-b292-49e6-a94f-43d674da1c49', 'craft', '2026-09-01 02:52:58.189', '2026-09-01 02:52:59.614', NULL),
(178, 1, 2, 'fec3e70c-c06d-42d1-b75a-fedd181822e0', 'craft', '2026-09-01 02:53:52.831', '2026-09-01 02:53:54.330', NULL),
(179, 1, 2, '2294c2e1-e99d-443e-a7ba-76d0f1b4b18b', 'craft', '2026-09-01 02:54:37.245', '2026-09-01 02:54:38.596', NULL),
(180, 1, 2, '1d719022-f90b-4908-9e9e-736f66e9f1de', 'craft', '2026-09-01 02:56:37.249', '2026-09-01 02:56:41.249', NULL),
(182, 1, 2, 'ada1847f-2e4d-4f2c-9f3b-845cb2eb6e32', 'craft', '2026-09-01 02:57:44.410', '2026-09-01 02:57:46.326', NULL),
(183, 1, 2, 'd1e39d0c-a949-4c48-9ace-a284bb2d7861', 'craft', '2026-09-01 02:58:30.441', '2026-09-01 02:58:31.908', NULL),
(185, 1, 2, 'f77a7208-eb0e-4cfd-8bc8-21300a4e1e89', 'studio', '2026-09-01 02:59:04.666', '2026-09-01 02:59:08.852', NULL),
(186, 1, 2, '57e3d29f-1a0e-4146-99d0-7c2b37df7498', 'craft', '2026-09-01 02:59:32.983', '2026-09-01 02:59:39.153', NULL),
(188, 1, 2, 'd3233112-e41f-4e10-9462-0adb920a0cbf', 'craft', '2026-09-01 03:06:30.135', '2026-09-01 03:06:36.805', NULL),
(189, 1, 2, 'cb2e6857-4acc-4c54-b1b9-98b78764eda4', 'studio', '2026-09-01 03:09:37.024', '2026-09-01 03:09:39.227', NULL);

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `asset_maintenance_records`
--
ALTER TABLE `asset_maintenance_records`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `asset_project_assignments`
--
ALTER TABLE `asset_project_assignments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2486;

--
-- AUTO_INCREMENT for table `automation_rules`
--
ALTER TABLE `automation_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `automation_runs`
--
ALTER TABLE `automation_runs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `budgets`
--
ALTER TABLE `budgets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `budget_items`
--
ALTER TABLE `budget_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `business_units`
--
ALTER TABLE `business_units`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `calendar_events`
--
ALTER TABLE `calendar_events`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `craft_order_drafts`
--
ALTER TABLE `craft_order_drafts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `craft_order_items`
--
ALTER TABLE `craft_order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=86;

--
-- AUTO_INCREMENT for table `document_templates`
--
ALTER TABLE `document_templates`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `domain_events`
--
ALTER TABLE `domain_events`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=477;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `filament_spools`
--
ALTER TABLE `filament_spools`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `financial_periods`
--
ALTER TABLE `financial_periods`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=249;

--
-- AUTO_INCREMENT for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `integrations`
--
ALTER TABLE `integrations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `integration_sync_logs`
--
ALTER TABLE `integration_sync_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `internal_transfers`
--
ALTER TABLE `internal_transfers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `inventory_movements`
--
ALTER TABLE `inventory_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=100;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `invoice_payment_schedules`
--
ALTER TABLE `invoice_payment_schedules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT for table `journal_entries`
--
ALTER TABLE `journal_entries`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=259;

--
-- AUTO_INCREMENT for table `journal_lines`
--
ALTER TABLE `journal_lines`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=517;

--
-- AUTO_INCREMENT for table `login_history`
--
ALTER TABLE `login_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_fee_rules`
--
ALTER TABLE `marketplace_fee_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `marketplace_settlements`
--
ALTER TABLE `marketplace_settlements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `marketplace_settlement_items`
--
ALTER TABLE `marketplace_settlement_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `master_options`
--
ALTER TABLE `master_options`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `materials`
--
ALTER TABLE `materials`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `material_batches`
--
ALTER TABLE `material_batches`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `material_categories`
--
ALTER TABLE `material_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `material_waste`
--
ALTER TABLE `material_waste`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2508;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=126;

--
-- AUTO_INCREMENT for table `partner_price_rules`
--
ALTER TABLE `partner_price_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `party_contacts`
--
ALTER TABLE `party_contacts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `party_roles`
--
ALTER TABLE `party_roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=131;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT for table `printers`
--
ALTER TABLE `printers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `printer_issues`
--
ALTER TABLE `printer_issues`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `printer_maintenance_records`
--
ALTER TABLE `printer_maintenance_records`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `printer_maintenance_schedules`
--
ALTER TABLE `printer_maintenance_schedules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `project_deliverables`
--
ALTER TABLE `project_deliverables`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `project_external_assignments`
--
ALTER TABLE `project_external_assignments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `project_milestones`
--
ALTER TABLE `project_milestones`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `purchase_requests`
--
ALTER TABLE `purchase_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `purchase_request_items`
--
ALTER TABLE `purchase_request_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `quotations`
--
ALTER TABLE `quotations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `quotation_items`
--
ALTER TABLE `quotation_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `quotation_templates`
--
ALTER TABLE `quotation_templates`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `quotation_template_items`
--
ALTER TABLE `quotation_template_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `report_definitions`
--
ALTER TABLE `report_definitions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `report_exports`
--
ALTER TABLE `report_exports`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=128;

--
-- AUTO_INCREMENT for table `sales_channels`
--
ALTER TABLE `sales_channels`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `service_package_items`
--
ALTER TABLE `service_package_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `stock_reservations`
--
ALTER TABLE `stock_reservations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `studio_projects`
--
ALTER TABLE `studio_projects`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=92;

--
-- AUTO_INCREMENT for table `studio_project_services`
--
ALTER TABLE `studio_project_services`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `studio_project_status_history`
--
ALTER TABLE `studio_project_status_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=143;

--
-- AUTO_INCREMENT for table `studio_services`
--
ALTER TABLE `studio_services`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `studio_service_categories`
--
ALTER TABLE `studio_service_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `supplier_invoices`
--
ALTER TABLE `supplier_invoices`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `transaction_categories`
--
ALTER TABLE `transaction_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `treasury_accounts`
--
ALTER TABLE `treasury_accounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=150;

--
-- AUTO_INCREMENT for table `units_of_measure`
--
ALTER TABLE `units_of_measure`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=367;

--
-- AUTO_INCREMENT for table `user_deletion_requests`
--
ALTER TABLE `user_deletion_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `user_presence_sessions`
--
ALTER TABLE `user_presence_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=191;

--
-- AUTO_INCREMENT for table `user_reactivation_requests`
--
ALTER TABLE `user_reactivation_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=285;

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
