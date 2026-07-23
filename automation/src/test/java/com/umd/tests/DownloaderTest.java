package com.umd.tests;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.Duration;

public class DownloaderTest {

    private WebDriver driver;
    private WebDriverWait wait;
    private final String BASE_URL = "https://vinaynalavade.github.io/universal-media-downloader/";

    @BeforeClass
    public void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless"); // Run headless for CI
        options.addArguments("--window-size=1920,1080");
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    @Test
    public void testHomepageLoads() {
        driver.get(BASE_URL);
        String title = driver.getTitle();
        Assert.assertTrue(title.contains("Universal Media Downloader"));
    }

    @Test(dependsOnMethods = "testHomepageLoads")
    public void testInvalidUrlValidation() {
        WebElement urlInput = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("url-input")));
        WebElement fetchBtn = driver.findElement(By.id("fetch-btn"));

        urlInput.sendKeys("invalid_string_not_a_url");
        fetchBtn.click();

        // Check if toast notification appears
        WebElement toast = wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("toast-error")));
        Assert.assertTrue(toast.getText().contains("valid URL"));
    }

    @AfterClass
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
