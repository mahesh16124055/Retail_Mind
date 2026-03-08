package com.retailmind.api.security;

import com.retailmind.api.domain.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.stream.Collectors;

public class UserPrincipal implements UserDetails {

    private String userId;
    private String username;
    private String email;
    private String password;
    private String storeId;
    private Collection<? extends GrantedAuthority> authorities;
    private boolean enabled;

    public UserPrincipal(String userId, String username, String email, String password, 
                        String storeId, Collection<? extends GrantedAuthority> authorities, boolean enabled) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.password = password;
        this.storeId = storeId;
        this.authorities = authorities;
        this.enabled = enabled;
    }

    public static UserPrincipal create(User user) {
        Collection<GrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toList());

        return new UserPrincipal(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getStoreId(),
                authorities,
                user.getEnabled() != null ? user.getEnabled() : true
        );
    }

    public String getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getStoreId() {
        return storeId;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
