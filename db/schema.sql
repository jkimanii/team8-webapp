/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.7.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: strathmore_marketplace
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `label` varchar(50) NOT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `label` (`label`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES
(9,'Counseling'),
(2,'Electronics'),
(3,'Fashion'),
(6,'Food'),
(4,'Furniture'),
(5,'Services'),
(1,'Textbooks'),
(8,'Wellness');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `listings`
--

DROP TABLE IF EXISTS `listings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `listings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `price` decimal(10,2) NOT NULL CHECK (`price` > 0),
  `condition` varchar(20) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `seller_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(20) NOT NULL DEFAULT 'available',
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `seller_id` (`seller_id`),
  CONSTRAINT `listings_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL,
  CONSTRAINT `listings_ibfk_2` FOREIGN KEY (`seller_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listings`
--

LOCK TABLES `listings` WRITE;
/*!40000 ALTER TABLE `listings` DISABLE KEYS */;
INSERT INTO `listings` VALUES
(1,'Calculus: Early Transcendentals (8th Ed.)',850.00,'Good','Used for ICS 1101. A few highlights in chapter 3 and 4 but otherwise clean. Willing to meet on campus.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvOsZL6r-CMk_D2jCygQxyGsHWJcgjjmpxQwa60vrtww&s=10',1,1,'2026-08-20 15:02:37','available'),
(2,'Samsung Galaxy Tab A7 Lite',12500.00,'Like New','Bought last semester, used it for two months. Comes with charger and original box. No scratches.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvfP0KIo7g6LhdUbgxdwkRFppCeuNUBVOicg-vVrCrXQ&s=10',2,2,'2026-08-20 15:02:37','available'),
(3,'Vintage Denim Jacket (Size M)',1500.00,'Good','90s style oversized denim jacket. Washed and ready to wear. Pickup near USIU gate.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRehETHd6NqAqKFMVZwM9i6WZE9JwdaDALlnq8S-Vl26w&s=10',3,3,'2026-08-20 15:02:37','available'),
(4,'Study Desk & Chair Set',4500.00,'Fair','Moving out of my apartment. Solid wood desk, minor scratches. Chair is comfortable. Self-transport required.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcTV3U6jPhb176EXF-BpFQLq0cv6REnFLeXRrzcxDb9g&s=10',4,4,'2026-08-20 15:02:37','available'),
(5,'Python Crash Course (2nd Ed.)',600.00,'Like New','Read once. No markings. Perfect for intro CS courses.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM1wQhQOTf7u2d87oW6spD_CEftQEpv4dp09UsjwZMGw&s=10',1,5,'2026-08-20 15:02:37','available'),
(6,'HP 240 G8 Laptop',35000.00,'Good','Intel i5, 8GB RAM, 256GB SSD. Running Windows 11. Battery holds 4hrs. Great for coursework.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCvHFKBdQIt70IcZ5_vrHijWrvK6HV6q7SetteE5q_ug&s=10',2,6,'2026-08-20 15:02:37','available'),
(7,'Home-baked Mandazi (Dozen)',200.00,'N/A','Fresh every Tuesday and Thursday morning. Order by 8pm the night before. Delivery within campus.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgBxkzwEO_jfs1rJ8SvzLXjhUWM3qlq7tMLycQ6mYK0A&s=10',6,7,'2026-08-20 15:02:37','available'),
(8,'Accounting Principles Textbook',950.00,'Fair',NULL,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSdVpFiYErkYnONVjHz_Bl_eDLyX8cOO1d3eInuaRf68Q&s=10',1,8,'2026-08-20 15:02:37','available'),
(9,'JBL Clip 4 Bluetooth Speaker',3200.00,'Like New','Used about 5 times. Still has original packaging. Waterproof, clips to backpacks.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNUKxiKO1lI97v-WgOVIZxCSCJKcGRqwVHtp8L2tSlkw&s=10',2,9,'2026-08-20 15:02:37','available'),
(10,'Tutoring — Mathematics & Stats',400.00,'N/A','3rd year ICS student. Comfortable with Calculus, Probability & Statistics, Linear Algebra. Price per hour.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBdaZIMjnvzER420B5nx-OuqrcgRc-fHYpyXDmrUVFRg&s=10',5,10,'2026-08-20 15:02:37','available'),
(11,'Scientific Calculator — Casio fx-991ES Plus',4000.00,'Good','Used throughout first year for ICS and Stats units. All functions working, buttons a bit worn but fully functional.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3Vl_h-PIv8dWQMz_9ndECsMLy6GgmN9WouyAn4kXZHQ&s=10',2,11,'2026-08-20 15:02:37','available'),
(12,'Graphic Design Services — Posters, Flyers, Logos',1000.00,'N/A','2nd year Design student offering quick turnaround graphic design for events, clubs, and small businesses. Price per project, DM for quote.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjE8GTtwdy0SUsKZsqC7SsfnPm2wkJCw9cdxXEXz1yKA&s=10',5,12,'2026-08-20 15:02:37','available'),
(13,'Ibuprofen 200mg (24 tablets)',250.00,'Like New','Sealed box, unopened. For headaches and minor pain relief. Pickup at the campus pharmacy counter.','https://placehold.co/400x300?text=Ibuprofen',8,13,'2026-09-11 08:41:01','available'),
(14,'Vitamin C 1000mg (30 tablets)',650.00,'Like New','Immune support supplement. Sealed bottle, expiry 2027.','https://placehold.co/400x300?text=Vitamin+C',8,13,'2026-09-11 08:41:01','available'),
(15,'First Aid Kit (Compact)',1200.00,'Like New','Plasters, antiseptic wipes, gauze, and bandages in a zip pouch. Fits in a backpack.','https://placehold.co/400x300?text=First+Aid+Kit',8,13,'2026-09-11 08:41:01','available'),
(16,'Herbal Sleep Tea (20 sachets)',450.00,'Like New','Chamomile and lavender blend. Caffeine-free, good for winding down before exams.','https://placehold.co/400x300?text=Sleep+Tea',8,13,'2026-09-11 08:41:01','available'),
(28,'1-on-1 Counseling Session',1500.00,'N/A','50-minute confidential session with a licensed campus counselor. Weekdays, by appointment.','https://placehold.co/400x300?text=Counseling+Session',9,14,'2026-09-11 08:50:22','available'),
(29,'Exam Stress & Anxiety Workshop',500.00,'N/A','Small-group session on managing exam pressure and building study routines. Runs weekly during term.','https://placehold.co/400x300?text=Stress+Workshop',9,14,'2026-09-11 08:50:22','available'),
(30,'General Health Check-Up',2000.00,'N/A','Routine consultation with a campus doctor. Includes basic vitals and a general wellness review.','https://placehold.co/400x300?text=Health+Check-Up',9,15,'2026-09-11 08:50:22','available'),
(31,'Nutrition Consultation',1200.00,'N/A','One-hour session with a campus nutritionist covering balanced eating on a student budget.','https://placehold.co/400x300?text=Nutrition+Consult',9,16,'2026-09-11 08:50:22','available');
/*!40000 ALTER TABLE `listings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `campus` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'Amara Osei','amara.osei@strathmore.edu','placeholder_hash','Strathmore University','2026-08-20 14:55:23'),
(2,'Kevin Mwangi','kevin.mwangi@strathmore.edu','placeholder_hash','Riara University','2026-08-20 14:55:23'),
(3,'Nilufar Rashidova','nilufar.rashidova@strathmore.edu','placeholder_hash','Strathmore University','2026-08-20 14:55:23'),
(4,'Brian Kipchoge','brian.kipchoge@strathmore.edu','placeholder_hash','Strathmore University','2026-08-20 14:55:23'),
(5,'Faith Kamau','faith.kamau@riara.ac.ke','placeholder_hash','Riara University','2026-08-20 14:55:23'),
(6,'Daniel Njoroge','daniel.njoroge@strathmore.edu','placeholder_hash','Riara University','2026-08-20 14:55:23'),
(7,'Grace Wanjiru','grace.wanjiru@strathmore.edu','placeholder_hash','Strathmore University','2026-08-20 14:55:23'),
(8,'Peter Otieno','peter.otieno@strathmore.edu','placeholder_hash','Daystar University','2026-08-20 14:55:23'),
(9,'Lena Mutebi','lena.mutebi@usiu.ac.ke','placeholder_hash','USIU','2026-08-20 14:55:23'),
(10,'Amos Kariuki','amos.kariuki@strathmore.edu','placeholder_hash','Daystar University','2026-08-20 14:55:23'),
(11,'Michael Ouma','michael.ouma@strathmore.edu','placeholder_hash','Strathmore University','2026-08-20 14:55:23'),
(12,'Sarah Achieng','sarah.achieng@kca.ac.ke','placeholder_hash','KCA University','2026-08-20 14:55:23'),
(13,'Strathmore Campus Pharmacy','pharmacy@strathmore.edu','placeholder_hash','Strathmore University','2026-09-11 08:41:01'),
(14,'Dr. Wanjiku Mwangi','w.mwangi@strathmore.edu','placeholder_hash','Strathmore University','2026-09-11 08:44:54'),
(15,'Dr. Samuel Ochieng','s.ochieng@strathmore.edu','placeholder_hash','Strathmore University','2026-09-11 08:44:54'),
(16,'Rehema Abdalla','r.abdalla@strathmore.edu','placeholder_hash','Strathmore University','2026-09-11 08:44:54');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'strathmore_marketplace'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-09-30 14:49:07
