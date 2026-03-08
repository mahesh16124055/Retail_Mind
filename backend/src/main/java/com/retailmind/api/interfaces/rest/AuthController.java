package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.JwtAuthenticationResponse;
import com.retailmind.api.application.dto.LoginRequest;
import com.retailmind.api.security.JwtTokenProvider;
import com.retailmind.api.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*")
@Tag(name = "Authentication", description = "User authentication and authorization endpoints")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthController(AuthenticationManager authenticationManager, JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
    }

    @PostMapping("/login")
    @Operation(
        summary = "User login",
        description = "Authenticate user and receive JWT token. Default credentials: username=admin, password=admin123"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Successfully authenticated",
            content = @Content(schema = @Schema(implementation = JwtAuthenticationResponse.class))
        ),
        @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        System.out.println("Login attempt for username: " + loginRequest.getUsername());
        
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );

            System.out.println("Authentication successful for: " + loginRequest.getUsername());
            SecurityContextHolder.getContext().setAuthentication(authentication);

            String jwt = tokenProvider.generateToken(authentication);
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

            return ResponseEntity.ok(new JwtAuthenticationResponse(
                    jwt,
                    userPrincipal.getUsername(),
                    userPrincipal.getUserId(),
                    userPrincipal.getStoreId()
            ));
        } catch (Exception e) {
            System.err.println("Authentication failed for username: " + loginRequest.getUsername());
            System.err.println("Error: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/me")
    @Operation(
        summary = "Get current user",
        description = "Retrieve information about the currently authenticated user",
        security = @SecurityRequirement(name = "bearer-jwt")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User information retrieved"),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        
        return ResponseEntity.ok(userPrincipal);
    }
}
