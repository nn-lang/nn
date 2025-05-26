# nn

[**English**](README.md)

nn은 딥 뉴럴 네트워크 모델을 정의하기 위해 만들어진 도메인 특화 언어입니다.

## 설치

```bash
git clone https://github.com/SieR-VR/nn
yarn install && yarn build
```

## 사용법

```bash
yarn nn -f {input file} -o {output file}
```

## 기능

### 크기 타입

```nn
Bypass[Size](x: Tensor[Size * 2]) =
 x
```

nn의 크기 인자를 통해 크기 값의 흐름을 직관적으로 표기할 수 있으며, 연산 또한 가능합니다.

### 텐서 타입 체킹

```nn
Linear[input, output](x: Tensor[input]) =
  |> MatMul(Trainable[input, output]('weight'))
  |> Bias(Trainable[input]('bias'))
                    ^^^^^
> Size mismatch: output != input
```

컴파일 타임에 텐서 쉐이프를 모두 결정하고, 이를 통해 실제로 코드를 실행하기 전에 사이즈 에러 발생을 예방할 수 있습니다.

### 간결한 코드

다음은 UNet의 nn 코드입니다:

```nn
ConvBlock[Channel](x: Tensor[H, W, C]) =
  |> Conv2D[3, 1, 1, Channel]()
  |> BatchNorm()
  |> ReLU()
  |> Conv2D[3, 1, 1, Channel]()
  |> BatchNorm()
  |> ReLU()

UNetEncoder[Channel](x: Tensor[H, W, C]) =
  |> ConvBlock[Channel]()
  |> MaxPool[2]()

UNetDecoder[Channel](x: Tensor[H, W, C], skip: Tensor[H, W, C]) =
  x
  |> Conv2DTransposed[3, 1, 1, Channel]()
  |> Concat(skip)
  |> ConvBlock[Channel]()

UNet[Channel](x: Tensor[H, W, C]) =
  |> s1 = UNetEncoder[Channel]()
  |> s2 = UNetEncoder[Channel * 2]()
  |> s3 = UNetEncoder[Channel * 4]()
  |> s4 = UNetEncoder[Channel * 8]()

  |> ConvBlock[Channel * 8]()

  |> UNetDecoder[Channel * 8](s4)
  |> UNetDecoder[Channel * 4](s3)
  |> UNetDecoder[Channel * 2](s2)
  |> UNetDecoder[Channel](s1)
```

공백 포함 30줄으로, [Pytorch 구현](https://github.com/milesial/Pytorch-UNet)의 125줄에 비하면 약 75% 적은 양의 코드입니다.

### 컴파일 타임 정적 분석

```
Linear[input, output](x: Tensor[input]) =
  |> MatMul(Trainable[input, output]('weight'))
  |> Bias(Trainable[output]('bias'))

Estimated Size
- input = 128, output = 32
- Trainable = 128 * 32 + 32 = 4,128 parameters (16.5KB in fp32)

Estimated Computing Size
- MatMul[input, output] x 1
- Bias[output] x 1
```

모델이 컴파일될 때, 모델의 파라미터를 이용하여 이 모델이 얼마나 많은 매개변수를 가질 지, 얼마나 많은 연산량을 가지는지 나타낼 수 있습니다.

### 문법상의 관심사 분리

nn 모델을 정의할 때 기억해야 할 키워드는 `Tensor` 하나입니다.

그 외엔 전부 특수문자, 사용자 정의 이름들로 이루어져 있으며, 언어를 모르는 사람도 이해할 수 있도록 코드를 작성할 수 있습니다.

## 기여

!TODO

## 라이센스

[MIT License](LICENSE)
