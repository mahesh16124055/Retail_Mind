package com.retailmind.api.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.kms.model.DecryptRequest;
import software.amazon.awssdk.services.kms.model.DecryptResponse;
import software.amazon.awssdk.services.kms.model.EncryptRequest;
import software.amazon.awssdk.services.kms.model.EncryptResponse;

import java.util.Base64;

/**
 * Service for encrypting and decrypting database credentials using AWS KMS.
 * Uses a dedicated KMS key for database credential encryption.
 */
@Slf4j
@Service
public class CredentialEncryptionService {
    
    private final KmsClient kmsClient;
    private static final String KEY_ALIAS = "alias/retailmind-db-credentials";
    
    public CredentialEncryptionService(KmsClient kmsClient) {
        this.kmsClient = kmsClient;
    }
    
    /**
     * Encrypts plaintext credentials using AWS KMS.
     *
     * @param plaintext Plaintext password to encrypt
     * @return Base64-encoded encrypted password
     */
    public String encrypt(String plaintext) {
        try {
            log.debug("Encrypting credentials using KMS key: {}", KEY_ALIAS);
            
            EncryptRequest request = EncryptRequest.builder()
                    .keyId(KEY_ALIAS)
                    .plaintext(SdkBytes.fromUtf8String(plaintext))
                    .build();
            
            EncryptResponse response = kmsClient.encrypt(request);
            String encrypted = Base64.getEncoder().encodeToString(
                    response.ciphertextBlob().asByteArray()
            );
            
            log.debug("Successfully encrypted credentials");
            return encrypted;
            
        } catch (Exception e) {
            log.error("Failed to encrypt credentials", e);
            throw new RuntimeException("Failed to encrypt credentials: " + e.getMessage(), e);
        }
    }
    
    /**
     * Decrypts encrypted credentials using AWS KMS.
     *
     * @param ciphertext Base64-encoded encrypted password
     * @return Decrypted plaintext password
     */
    public String decrypt(String ciphertext) {
        try {
            log.debug("Decrypting credentials using KMS");
            
            DecryptRequest request = DecryptRequest.builder()
                    .ciphertextBlob(SdkBytes.fromByteArray(
                            Base64.getDecoder().decode(ciphertext)
                    ))
                    .build();
            
            DecryptResponse response = kmsClient.decrypt(request);
            String decrypted = response.plaintext().asUtf8String();
            
            log.debug("Successfully decrypted credentials");
            return decrypted;
            
        } catch (Exception e) {
            log.error("Failed to decrypt credentials", e);
            throw new RuntimeException("Failed to decrypt credentials: " + e.getMessage(), e);
        }
    }
}
