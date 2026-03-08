package com.retailmind.api.security;

import com.retailmind.api.domain.model.User;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final RetailMindRepository repository;

    public CustomUserDetailsService(RetailMindRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        System.out.println("CustomUserDetailsService.loadUserByUsername called with username: " + username);
        
        User user = repository.getUserByUsername(username);
        
        if (user == null) {
            System.err.println("User not found with username: " + username);
            throw new UsernameNotFoundException("User not found with username: " + username);
        }

        System.out.println("User found: " + user.getUsername() + ", enabled: " + user.getEnabled());
        System.out.println("User roles: " + user.getRoles());
        System.out.println("User password hash: " + (user.getPasswordHash() != null ? "present" : "null"));
        
        UserPrincipal principal = UserPrincipal.create(user);
        System.out.println("UserPrincipal created with authorities: " + principal.getAuthorities());
        
        return principal;
    }

    public UserDetails loadUserById(String userId) {
        User user = repository.getUser(userId);
        
        if (user == null) {
            throw new UsernameNotFoundException("User not found with id: " + userId);
        }

        return UserPrincipal.create(user);
    }
}
