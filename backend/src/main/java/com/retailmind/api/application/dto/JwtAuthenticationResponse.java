package com.retailmind.api.application.dto;

public class JwtAuthenticationResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private String username;
    private String userId;
    private String storeId;

    public JwtAuthenticationResponse(String accessToken, String username, String userId, String storeId) {
        this.accessToken = accessToken;
        this.username = username;
        this.userId = userId;
        this.storeId = storeId;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getStoreId() {
        return storeId;
    }

    public void setStoreId(String storeId) {
        this.storeId = storeId;
    }
}
