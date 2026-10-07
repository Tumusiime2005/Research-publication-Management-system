package com.brainhub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class BrainHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(BrainHubApplication.class, args);
    }
}
