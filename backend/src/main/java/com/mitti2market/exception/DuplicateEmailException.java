package com.mitti2market.exception;

public class DuplicateEmailException extends BadRequestException {

    public DuplicateEmailException(String email) {
        super("A user with email '" + email + "' already exists");
    }
}
