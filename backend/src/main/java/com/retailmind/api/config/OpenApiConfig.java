package com.retailmind.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI retailMindOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("RetailMind API")
                        .description("AI-Powered Inventory and Demand Intelligence Platform for Retailers")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("RetailMind Team")
                                .email("support@retailmind.ai")
                                .url("https://retailmind.ai"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080")
                                .description("Local Development Server"),
                        new Server()
                                .url("https://api.retailmind.ai")
                                .description("Production Server")))
                .components(new Components()
                        .addSecuritySchemes("bearer-jwt", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT token for authentication. Login via /api/v1/auth/login to get token.")))
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}
