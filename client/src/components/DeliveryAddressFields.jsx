const fields = [
  ['recipientName', 'Recipient name', 'name', 2, 80],
  ['phone', 'Phone number', 'tel', 7, 30],
  ['addressLine1', 'Address line 1', 'address-line1', 5, 160],
  ['addressLine2', 'Address line 2', 'address-line2', 0, 160],
  ['city', 'City', 'address-level2', 2, 80],
  ['province', 'Province', 'address-level1', 2, 80],
  ['postalCode', 'Postal code', 'postal-code', 3, 12],
  ['country', 'Country', 'country-name'],
];

export function DeliveryAddressFields({
  address,
  onChange,
  error,
  idPrefix = 'purchase',
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(([field, label, autoComplete, minLength, maxLength]) => {
        const message = (Array.isArray(error?.details) ? error.details : []).find(
          (detail) => detail.field === `deliveryAddress.${field}`,
        )?.message;
        const id = `${idPrefix}-${field}`;
        return (
          <div
            className={`form-field ${field.startsWith('address') ? 'sm:col-span-2' : ''}`}
            key={field}
          >
            <label htmlFor={id}>
              {label}
              {field === 'addressLine2' && (
                <span className="ml-2 font-normal normal-case text-text-muted">
                  Optional
                </span>
              )}
            </label>
            <input
              id={id}
              className="form-input"
              type={field === 'phone' ? 'tel' : 'text'}
              autoComplete={autoComplete}
              value={address[field]}
              required={field !== 'addressLine2'}
              readOnly={field === 'country'}
              minLength={minLength}
              maxLength={maxLength}
              aria-invalid={Boolean(message)}
              aria-describedby={message ? `${id}-error` : undefined}
              onChange={(event) => onChange(field, event.target.value)}
            />
            {message && (
              <span id={`${id}-error`} className="form-field-error">
                {message}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
