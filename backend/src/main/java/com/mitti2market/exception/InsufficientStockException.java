package com.mitti2market.exception;

public class InsufficientStockException extends BadRequestException {

    public InsufficientStockException(String produceName, int requested, int available) {
        super(String.format("Insufficient stock for '%s': requested %d, available %d",
                produceName, requested, available));
    }
}
