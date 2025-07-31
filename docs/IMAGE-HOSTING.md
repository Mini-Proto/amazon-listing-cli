# Image Hosting for Amazon Listings

## Quick Setup with S3

1. **Create S3 Bucket**
```bash
aws s3 mb s3://miniproto-product-images
aws s3api put-bucket-policy --bucket miniproto-product-images --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::miniproto-product-images/*"
  }]
}'
```

2. **Upload Images**
```bash
aws s3 cp wire-harness.jpg s3://miniproto-product-images/products/ --acl public-read
```

3. **Use in YAML Config**
```yaml
external_image_urls:
  - "https://miniproto-product-images.s3.amazonaws.com/products/wire-harness.jpg"
```

## Integration with CLI

We could modify the image upload service to:
1. Upload to your S3 bucket instead of Amazon's API
2. Return the public S3 URLs
3. Use those URLs in the listing attributes

Would you like me to implement S3 upload integration?