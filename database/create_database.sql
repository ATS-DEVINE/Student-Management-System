-- Student Management System Database Script
-- Create and configure the student_db database

-- Drop database if it exists (for fresh setup)
DROP DATABASE IF EXISTS student_db;

-- Create the database
CREATE DATABASE student_db;

-- Use the database
USE student_db;

-- Create students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    course VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample data for testing
INSERT INTO students (name, email, course) VALUES
('John Doe', 'john.doe@example.com', 'Computer Science'),
('Jane Smith', 'jane.smith@example.com', 'Information Technology'),
('Mike Johnson', 'mike.johnson@example.com', 'Software Engineering'),
('Sarah Williams', 'sarah.williams@example.com', 'Data Science'),
('David Brown', 'david.brown@example.com', 'Cyber Security');

-- Display the table structure
DESCRIBE students;

-- Display sample data
SELECT * FROM students;

-- Create indexes for better performance
CREATE INDEX idx_email ON students(email);
CREATE INDEX idx_name ON students(name);
CREATE INDEX idx_course ON students(course);
